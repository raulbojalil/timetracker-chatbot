const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || ''; 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''; //optional

const TelegramBot = require('node-telegram-bot-api');
const { Configuration, OpenAIApi } = require("openai");
const { TimeTrackerHandler } = require('./handlers/timetracker-handler');
const fs = require('fs');

// Code to generate the training data
// fs.readFile('task_descriptions.json', 'utf8', (err, data) => {

//    function generateRandomInteger(min, max) {
//       return Math.floor(min + Math.random()*(max - min + 1));
//    }

//    function getRandomItem(items) {
//       return items[generateRandomInteger(0, items.length - 1)]; 
//    }

//   if (err) {
//     console.error(err);
//     return;
//   }
//   const array = JSON.parse(data).data;

//   for (let i=0; i < array.length; i++) {
//    const taskDescription = array[i].name;
//    const hours = generateRandomInteger(1,9);
//    const union = getRandomItem([" for ", ", ", " "]);
//    const hoursLabels = getRandomItem([" hours", " hrs", " h", " hs", "h", "hs", "hrs"]);
//    const completion = `tt ${hours} ${array[i].id} \\"${taskDescription}\\"`;
//    const prompt = `${taskDescription}${union}${hours}${hoursLabels}`;
//    console.log(`{"prompt":"${prompt}", "completion":" ${completion}"}`);
//   }
// });


const bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});
  
const openai = new OpenAIApi(new Configuration({
   apiKey: OPENAI_API_KEY,
}));

const chatBotEngine = {

   bot: bot,
   waitForResponseCallback: [],
   buttons: [],
   buttonsPage: 1,
   handlers: [], //{ constructor: Object, activator: (msg) => boolean, handlers: {} }

   registerHandler: (activator, classType) => {
     chatBotEngine.handlers.push({ constructor: classType, activator, handlers: {} });   
   },

   sendMessage: (chatId, text) => { 
      chatBotEngine.bot.sendMessage(chatId, text || "No message");
   },

   sendButtons: (chatId, text) => { 

     if(chatBotEngine.buttons.length <= 3){
      
        const btns = [];
        for(let i=0; i < chatBotEngine.buttons.length; i++) { 
          btns.push([chatBotEngine.buttons[i]]);
        }        

        bot.sendMessage(chatId, text || "-", {"reply_markup": { "keyboard": btns  }});
     }
     else if(chatBotEngine.buttons.length == 4) {
       bot.sendMessage(chatId, text || "-", {"reply_markup": { "keyboard": [[chatBotEngine.buttons[0], chatBotEngine.buttons[1]], [chatBotEngine.buttons[2], chatBotEngine.buttons[3]]] }});
     }
     else {
         const pagedButtons = [];
         const currentButtonRow = [];
         const startingIndex = (chatBotEngine.buttonsPage-1)*4;

         for(let j = startingIndex; j < Math.min(startingIndex + 4, chatBotEngine.buttons.length); j++) {

            currentButtonRow.push(chatBotEngine.buttons[j]);
            if(currentButtonRow.length == 2) {
               pagedButtons.push(currentButtonRow);
                  currentButtonRow = [];
            }
         }

         if(currentButtonRow.length > 0)
            pagedButtons.push(currentButtonRow);

         if(chatBotEngine.buttonsPage <= 1)
            pagedButtons.push(["->"]);
         else if(chatBotEngine.buttonsPage >= Math.ceil(chatBotEngine.buttons.length / 4))
            pagedButtons.push(["<-"]);
         else
            pagedButtons.push(["<-", "->"]);

         bot.sendMessage(chatId, text || "-", {"reply_markup": { "keyboard": pagedButtons }});
     }
   },

   waitForResponse: (chatId, text, callback) => { 
      chatBotEngine.bot.sendMessage(chatId, text || "No message");
      if (callback) {
         chatBotEngine.waitForResponseCallback.push(callback);
      }
   },

   showButtons: (chatId, text, buttons, callback) => {
      chatBotEngine.buttonsPage = 1;
      chatBotEngine.buttons = buttons;
      if (callback) {
         chatBotEngine.waitForResponseCallback.push(callback);
      }
      chatBotEngine.sendButtons(chatId, text);
   },

   handleMessage: async (msg) => { 
      try {

         const msgText = msg.text.toString().toLowerCase();

         if(chatBotEngine.buttons) {
            
            const totalPages = Math.ceil(chatBotEngine.buttons.length / 4);
            if (msgText == "<-") {
               chatBotEngine.buttonsPage = Math.max(1, chatBotEngine.buttonsPage-1); 
               chatBotEngine.sendButtons(msg.chat.id, "(" + chatBotEngine.buttonsPage + "/" + totalPages + ")");
               return;
            }
            else if (msgText == "->") {  
               chatBotEngine.buttonsPage = Math.min(chatBotEngine.buttonsPage + 1, Math.ceil(chatBotEngine.buttons.length / 4));
               chatBotEngine.sendButtons(msg.chat.id, "(" + chatBotEngine.buttonsPage + "/" + totalPages + ")");
               return;
            }
            else {

               // var page = parseInt(msgText);

               // if(page) { 
               //    chatBotEngine.buttonsPage = Math.min(page, totalPages);
               //    chatBotEngine.sendButtons(msg.chat.id, "(" + chatBotEngine.buttonsPage + "/" + totalPages + ")");
               //    return;
               // }
            }

            chatBotEngine.buttons = [];
         }

         if (chatBotEngine.waitForResponseCallback.length > 0) {
            chatBotEngine.waitForResponseCallback[chatBotEngine.waitForResponseCallback.length-1](msg);
            chatBotEngine.waitForResponseCallback.splice(0,1);
            return;
         }
         
         const handler = chatBotEngine.handlers.find(x => x.activator(msg));

         if (handler) {
            if (!handler.handlers[msg.chat.id])
               handler.handlers[msg.chat.id] = new handler.constructor(msg.chat.id, chatBotEngine, openai);
            try {
               await handler.handlers[msg.chat.id].handleMessage(msg);
            }
            catch (ex) {
               bot.sendMessage(msg.chat.id, ex || "Error");
            }
         }
         else {
            bot.sendMessage(msg.chat.id, "Command pas trouvée");
         }
      }
      catch (e) { 
         // eslint-disable-next-line no-console
         console.log(e);
         bot.sendMessage(msg.chat.id, e || "Error");
      }
   }
};

chatBotEngine.registerHandler(() => true, TimeTrackerHandler);

bot.on('message', (msg) => {
   chatBotEngine.handleMessage(msg);
});
