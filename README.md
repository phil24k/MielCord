# MielCord 

<img width="2134" height="2134" alt="mielcord_logo_st" src="https://github.com/user-attachments/assets/2a4689fd-6be2-4e75-a9f0-0e0ccaea0884" />


**A self-hostable, privacy-first communication platform for you and your friends.**

MielCord was created in response to growing privacy concerns surrounding large communication platforms, including recent announcements about age verification and data collection.

When you use a centralized platform, your messages, account information, and other data are stored on infrastructure you do not control. With MielCord, you host the platform yourself and remain in control of your data.

Application data is stored locally in a database file on your own computer or server. MielCord does not send your data to an external MielCord service.

> MielCord is not intended to replace Discord entirely.
> Each MielCord installation works more like a private Discord server built for a specific group of friends, family members, or community members.

Host your own private communication server with MielCord.

## Features

* Self-hosted and under your control
* Text channels and private conversations
* Voice and video communication
* Screen sharing
* Local database storage
* No centralized MielCord account required
* Designed for small private communities

## Installation

Docker is the recommended installation method because it simplifies deployment, updates, and dependency management.

You can also run MielCord directly on a Linux system.

### Native Linux Installation

Clone the repository:

```bash
git clone https://github.com/phil24k/MielCord.git
cd MielCord
```

Give the MielCord launcher permission to run:

```bash
chmod +x mielcord
```

Start MielCord:

```bash
./mielcord
```

Once the server is running, open the displayed address in a modern web browser.

## Requirements

For a native installation:

* Linux
* Python 3.10 or newer
* GCC
* Make
* A modern browser with support for voice, camera, and screen sharing

For a Docker installation:

* Docker
* Docker Compose

## Updating

To download the latest changes:

```bash
git pull
```

If you are using Docker, rebuild and restart the containers:

```bash
docker compose up -d --build
```

## Privacy

MielCord is designed to keep application data on infrastructure controlled by the server owner.

The server administrator is responsible for:

* Securing the host system
* Managing backups
* Configuring HTTPS
* Restricting access to the server
* Keeping MielCord and its dependencies updated

For secure access over the internet, using HTTPS is strongly recommended.

## Project Status

MielCord is currently under active development. Bugs, breaking changes, and incomplete features may still be present.

Do not rely on MielCord as the only storage location for important data. Regular backups are recommended.

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

To contribute:

1. Fork the repository.
2. Create a new branch.
3. Make your changes.
4. Open a pull request.

## License

See the `LICENSE` file for licensing information.
