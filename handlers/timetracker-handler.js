const { TimeTracker } = require('../services/timetracker');

const States = {
  LoggedOut: 0,
  ReadAuthentication: 1,
  ReadProject: 2,
  ReadFocalPoint: 3,
  ReadHours: 4,
  ReadTaskDescription: 5,
  ReadTaskWithAI: 6,
  Confirmation: 7,
};

class TimeTrackerHandler {

    constructor(chatId, chatBotEngine, openai) {
        this.openaiEnabled = !!openai;
        this.chatId = chatId;  
        this.chatBotEngine = chatBotEngine;
        this.openai = openai;
        this.authorization = "";
        this.focalPointId = "";
        this.projectId = "";
        this.projects = [];
        this.taskCategories = [];
        this.userInfo = {};
        this.state = States.LoggedOut;
       
        this.messageHandlers = {
          [States.LoggedOut]: async (msg) => { 
            this.chatBotEngine.sendMessage(
              msg.chat.id, 
              "I can't access the timetracker API, can you paste the Authorization header here please? Make sure to include the Bearer part, get it from here https://employees.bairesdev.com/time-tracker"
            );
            this.state = States.ReadAuthentication;
          },
          
          [States.ReadAuthentication]: async (msg) => {
            this.authorization = msg.text;
            const authIsOk = await this.refreshData();
            if (authIsOk) {
              this.chatBotEngine.showButtons(
                msg.chat.id, 
                "What is your project ID? (enter the id or press the corresponding button)",
                this.projects.map(x => `${x.name} (${x.id})`)
              )
              this.state = States.ReadProject;
            } else {
              this.chatBotEngine.sendMessage(
                msg.chat.id, 
                "Authentication failed, please paste the Authorization header again"
              );
              this.state = States.ReadAuthentication;
            }
          },
          [States.ReadProject]: async (msg) => {
            this.projectId = this.readId(msg.text);
            const monthDates = this.getCurrentMonthDates();
            await this.ensureAuthorization(msg, async () => {
              return await TimeTracker.getFocalPoints(this.authorization, this.projectId, monthDates.fromDate, monthDates.toDate);
            }, async (focalPoints) => {
              this.chatBotEngine.showButtons(
                msg.chat.id, 
                "What is your focal point? (enter the id or press the corresponding button)", 
                focalPoints.map(x => `${x.name} (${x.id})`)
              );
              this.state = States.ReadFocalPoint;
            });
          },
          [States.ReadFocalPoint]: async (msg) => {
            this.focalPointId = this.readId(msg.text);

            if (this.openaiEnabled) {
              this.chatBotEngine.sendMessage(
                msg.chat.id, 
                'All set, now tell me what you worked on, for example: "worked on AB-123, 3 hours", or code reviewed AB-987 for 1hr',
              );
              this.state = States.ReadTaskWithAI;
            } else {
              this.chatBotEngine.sendMessage(
                msg.chat.id, 
                "All set, now tell me what you worked on"
              );
              this.state = States.ReadTaskDescription;
            }
          },
          [States.ReadTaskWithAI]: async (msg) => {
            const prompt = this.generatePrompt(msg.text);
            const aiResponse = await this.createOpenAiCompletion(prompt);
            const params = this.parseCommand(aiResponse);

            if (params) {
              this.chatBotEngine.showButtons(
                msg.chat.id, 
                "Is this correct? " + JSON.stringify(params), 
                ["Yes", "No"], async (resMsg) => {  
                if (resMsg.text === "Yes") {
                  await this.ensureAuthorization(msg, async () => {
                    return await TimeTracker.upsertRecord(
                      this.authorization,
                      this.projectId,
                      this.getCurrentDate(),
                      params.hours,
                      this.focalPointId,
                      params.taskDescriptionId,
                      params.comments,
                    );
                  }, async (response) => {
                    if (response.error) {
                      this.chatBotEngine.sendMessage(
                        msg.chat.id,
                        "An error has occurred. " + response.data
                      );
                    } else {
                      this.chatBotEngine.sendMessage(
                        msg.chat.id,
                        "Record inserted successfully, please enter another task"
                      );
                    }
                  });
                  
                } else {
                  this.chatBotEngine.sendMessage(
                    msg.chat.id,
                    "Ok, no problem, please try again"
                  );
                }
              });
            } else {
              this.chatBotEngine.sendMessage(
                msg.chat.id,
                "No response obtained from the AI, please try again"
              );
            }
          },
          [States.ReadTaskDescription]: async (msg) => {
            this.taskDescription = msg.text;
            this.chatBotEngine.showButtons(msg.chat.id, "How many hours did you work?", ["0.15", "0.30", "1", "2", "3", "4", "5", "6", "7", "8"]);
            this.state = States.ReadHours;
          },          
          [States.ReadHours]: async (msg) => {
            const hours = msg.text;
          
            await this.ensureAuthorization(msg, async () => {
              return await TimeTracker.upsertRecord(
                this.authorization,
                this.projectId,
                this.getCurrentDate(),
                hours,
                this.focalPointId,
                "783",
                this.taskDescription,
              );
            });
            this.chatBotEngine.sendMessage(msg.chat.id, "Record added successfully, please enter a new task description to record it");
            this.state = States.ReadTask;
          }
        }
    }

    readId(text) {
      const regex = /\((.*?)\)/;
      const matches = text.match(regex);
      if (matches.length == 2) {
        return matches[1];
      }
      return text || "";
    }

    generatePrompt(text) {
      return `Convert this text to a programmatic command:

      Example: worked on AB-678 for 10 hours
      Output: tt 10 783 "worked on AB-678"
      Example: code reviewed AB-123 for 1h
      Output: tt 1 779 "Code reviewed AB-123"
      ${text}
      Output:`;
    }

    parseCommand(text) {
      //'tt 8 783 "Code reviewed AB-123"'
      const regex = /(\S+)\s+(\S+)\s+"([\S\s]+)"/;

      const array = [...text.match(regex)];
      if (array) {
        return {
          hours: array[1],
          taskDescriptionId: array[2],
          comments: array[3]
        }
      }
    }

    async ensureAuthorization(msg, fetchFunc, onSuccess) {
      try {
        const response = await fetchFunc();
        console.log(response);
        if (response.isUnauthorized) {
          this.chatBotEngine.sendMessage(
            msg.chat.id, 
            "Looks like your credentials are no longer valid, please set them again"
          );
          this.state = States.ReadAuthentication;
        } else {
          if (onSuccess) {
            await onSuccess(response);
          }
          return response;
        }
      }
      catch(e) {
        this.chatBotEngine.sendMessage(
          msg.chat.id, 
          "An error occurred fetching the data, please try again"
        );
      }
    }

    getCurrentDate() {
      return new Date().toJSON().split("T")[0] + "T00:00:00.000Z";
    }

    getCurrentMonthDates() {
      const now = new Date();
      const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      let toDate = new Date(fromDate.getTime());
      toDate = new Date(toDate.setMonth(toDate.getMonth() + 1));
      toDate = new Date(toDate.setDate(toDate.getDate() - 1));

      return {
          fromDate: fromDate.toJSON().split("T")[0] + "T00:00:00.000Z",
          toDate: toDate.toJSON().split("T")[0] + "T23:59:59.999Z",
      }
    }

    async refreshData() {

        const isLoggedIn = await this.isAuthorized();

        if (!isLoggedIn) {
            return false;
        }

        const monthDates = this.getCurrentMonthDates();

        const data = await Promise.all([
            TimeTracker.getProjects(this.authorization, monthDates.fromDate, monthDates.toDate),
            TimeTracker.getTaskCategories(this.authorization, monthDates.fromDate, monthDates.toDate),
        ]);

        this.projects = data[0];
        this.taskCategories = data[1];

        return true;
    }

    async isAuthorized() {
        if (!this.authorization) {
            return false;
        }
        const userInfo = await TimeTracker.getUserInfo(this.authorization);
        
        if (userInfo.isUnauthorized || userInfo.error) {
            this.authorization = "";
            return false;
        }

        this.userInfo = userInfo[0];

        return true;
    }

    async createOpenAiCompletion(prompt) {
      const response = await this.openai.createCompletion({
          model: "text-davinci-003",
          prompt,
          temperature: 0.1,
          max_tokens: 100,
          top_p: 1,
          frequency_penalty: 0.2,
          presence_penalty: 0,
      });
      const choice = response.data.choices[0].text;
      console.log({ openAiResponse: choice });
      return choice;
    }

    async handleMessage(msg) {
      await this.messageHandlers[this.state](msg);
    }
}

exports.TimeTrackerHandler = TimeTrackerHandler;
