# Segfault

> **Segfault** (v4.2.0α) is a Discord bot written in TypeScript using Discord.JS for the
**Thinking with Portals**' Discord.

----
<br/>

## What is **Segfault**?
Designed for the **Thinking with Portals'** Discord server, **Segfault** is a
custom-built Discord bot _platform_. It is designed to be expanded upon by
others.

Unlike other Discord bots, **Segfault** has 2 goals in mind:
### 1. Manage a handful of guilds at a time.
As opposed to bigger bots which are designed to handle 100s of guilds at the
same time, or smaller bots which are only run in a single server, **Segfault**
is designed with managed a couple at the same time. Like a group of servers,
which may share the same admin.
### 2. Modular design
**Segfault** at its core has been designed to make designing custom behaviour
as easy as possible. **Segfault** uses a system called "Modules" to allow
developers to implement commands, interactions, guild-specific behaviour, and in
future, just about anything people want from Discord bots.

----
<br/>

## What's the plan?
Currently, this is a very basic version of **Segfault**, and lacks most planned
features.

### Plans for **Segfault** include:
 - **Enable/Disable** – While there is logic handling guild-specific behaviour,
 there's no actual system behind enabling/disabling Modules for guilds.
 - **Implementation of Events** – Modules can define their own events (e.g., a
 moderation Module might add its own Events to log deleted messages).
 - **Loadable Modules** – While a system already exists to reload Modules (and 
 also scan directories for new Modules), this system isn't particularly useful
 for those without access to the machine on which **Segfault** is running on to
 add those files. The plan here is to add a way that Modules can be added from
 Discord.
 - **Sandboxed Modules** – Currently Modules run on the same "machine" as the
 rest of the bot. For safety and security reasons (namely running unknown
 Modules), the plan is make Modules sandboxed in a VM and only expose certain
 interfaces.
    - **Tag System** – Furthermore, from these last two points, is Tags.
    Currently Module Tags go unused. The idea for them being that servers can
    search loaded Modules for ones to enable by Tags. As well as Tags
    potentially being used to determine Module behaviour/intents (escape
    Sandboxes, connect to the internet, etc.).
 - **Separation of CoreLib** – **CoreLib** is the poorly named library which
 **Segfault** uses to actually do stuff. This might be of some use to people
 (although perhaps unlikely, mostly it's wrappers for Discord.JS), so the plan
 is to actually turn it into a separate library, instead of a high-integrated
 mess.

### Plans for Modules (that'll be bundled with **Segfault**) include:
 - **Help** – A Module that'll actually shows the `IInfo` object that Modules
 have.
 - **Browser** – A Module that'll allow guild admin to enable/disable loaded
 Modules in their guild.
 - **Config** – A Module that'll let users configure Modules/Commands.
 - **Moderation** – A Module that'll (hopefully) be similar to larger bots
 similar methods of moderation, as to showcase Events (when added).
 - **Flag Content** – A Module that'll allow users to flag messages or users,
 so they can discretely notify admin.
 - **Give Role** – A Module that'll allow server admin to add "Role React"
 messages, Commands, and perhaps other methods.
 - **Pin Message** – A Module to allow allowed users to post embeds to
 predetermined channels.



 ## Hold on, if that's the _planned_ stuff, what's actually included?
 Er... A dummy `debug` command that doesn't do anything, a command that performs
 a soft reset, but is disabled, and a command that just links 2 channels
 together.



 ## That's it?
 Well, it shouldn't be _too_ hard to do the rest now!<br/>
 ...Hopefully

 ## Fine. How can I help?
 Currently in-code documentation is lacking to say the least, however, it should
 be  (cursed words) "self-explanatory". If you do need some assistance reading
 it, try contacting  Wii2 on Discord (`Wii2#9999`), they might know.

 ----
<br/>

# Dev things

## Project Info
TypeScript with Yarn as package manager.
Programmed in VSCode with Prettier, ESLint, & TSLint.
Runs directly in TS-Node.



## "Build" instructions
1. Pull repo.

2. Install **ESLint** & **Prettier** (and optionally a`JSON5 syntax
highlighter`) for **VSCode**.

3. Run `yarn` in directory. This should set up Yarn.

4. Run `yarn install-package` to pull all dependencies (You should _not_ have a
`node_modules` folder).

5. Open `config.json5.example` and, well, configure it. Resave it as
`config.json5`.

6. Run `yarn ts-node -R` to start Segfault. It should run first-time set up
things (the `-R` forces the bot to sync commands with Discord).



## What's `package.json5`?
An attempt to provide a better dependency solution than just `package.json`.
Unfortunately, Yarn does not natively support JSON5 (and I forgot to consider
pnpm which does), so a somewhat hack solution has to be implemented
(`yarn install-package`). **Note:** this, unsurprisingly, does not work with
`yarn add` or `yarn remove`. If you change the dependencies in some way, please
remember to update `package.json5` (and if you're feeling particularly nice, 
maybe even include some comments about why or where packages are used).