# What is this?
This is a Node.js telegram chatbot for the BairesDev TimeTracker. Supports the use of natural language thanks to GPT.

## How to run
Run npm install to install all dependencies. Before running with npm start, set the following environment variables:

- TELEGRAM_TOKEN: Your telegram bot token (Required)
- OPENAI_API_KEY: Your OpenAI API key. This is optional, if you don't specify it the chatbot won't use any AI capabilities.

## How to use
Enter any message to initialize the bot. The bot will ask you for your Authorization header. Use the following steps to get the Authorization header.

- Go to https://employees.bairesdev.com/time-tracker
- Open the developer console
- Log in using your credentials
- In the developer console, go to the Network tab and filter by "user-info"
- Select the user-info network request and copy the Authorization header value (under Headers -> Request headers)
- Copy the entire value (including the "Bearer" part) and paste it in the chat
- Follow the prompts on-screen to continue
