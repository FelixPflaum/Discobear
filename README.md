# Discobear
Just another music bot for Discord I guess.

## Features
- Plays music from youtube.
- Play, queue, skip and stop slash commands.
- Supports translations.

## How to use
In the cloned or downloaded directory:
1. Run `npm install` to install dependencies.
3. Run `npm run build` to transpile the ts source.
4. Start once with `npm start` to create a default config.json.
5. Create a bot application at https://discord.com/developers/applications and copy the bot token.
6. Set "discordToken" in the config.json to your bot token. You can adjust other settings if you want.
7. Run bot with `npm start`.
8. Add it to your server using this URL: \
`https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_APP_ID_HERE&permissions=3147776&scope=bot+applications.commands` \
Replace YOUR_BOT_APP_ID_HERE with the application ID of the application created in step 5.

The /play command that causes the bot to join a voice channel will determine the text channel used to send messages for that voice session. Direct replies to slash commands always apear in the channel the slash command was made in.

You may want to restrict the bot's slash commands to e.g. a dedicated music bot channel. To do that go to your server settings in discord. Go to Integrations, locate your bot and click Manage. There you can set which roles can use (which) commands and in which channel(s). 

## Config
- `discordToken`: The Discord bot token to login with.
- `videoMaxDuration`: Maximum video length (in seconds) that is allowed.
- `playListMaxSize`: Maximum playlist length that is allowed.
- `playListMaxDuration`: Maximum combined playlist video length (in seconds) that is allowed.
- `language`: The translation to use. Must be the name of a file in the "translations" directory, without the .json file extension.
