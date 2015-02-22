# AI BotKill - Team: Sons of Lion
Bot that won the AI BotKill 2015 competition. More info about the contest https://twitter.com/aibotkill

# Usage
1. Install node.js. Google will be your assistant.
2. Install websocket and victor modules:

    > npm install websocket victor

3. Add config.json file with the following content:

	{
		"teamId":"<your team GUID>",
		"server":"ws://server:port/"
	}

3. Start your bot:

    > node bot.js

4. Stop bot by pressing ctrl+c