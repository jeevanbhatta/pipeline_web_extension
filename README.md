# Web Task Data Collector

> A Chrome extension for collecting human demonstration data to train autonomous web agents

## Overview

This extension enables large-scale collection of human demonstrations performing web tasks. The recorded data serves as training material for web agents — AI systems that can autonomously navigate websites, fill forms, and complete complex multi-step tasks on behalf of users.

### Why Collect Human Demonstrations?

Training effective web agents requires high-quality data showing:
- **What** actions humans take to complete web tasks
- **How** they navigate complex UIs and handle edge cases
- **When** they make decisions about clicks, scrolls, and inputs
- **Where** they focus their attention on the screen

By recording real users completing defined tasks, we capture the implicit knowledge and decision-making patterns that make humans effective at web navigation.

## Use Cases

### 🤖 Web Agent Training
- **Imitation Learning**: Train agents to mimic human behavior patterns
- **Reinforcement Learning**: Use demonstrations as expert trajectories for reward shaping
- **Behavioral Cloning**: Direct supervised learning from state-action pairs

### 📊 Research Applications
- Human-computer interaction studies
- Web usability research
- Task completion time analysis
- Error recovery pattern analysis

### 🏢 Enterprise Applications
- Process documentation through demonstration
- Quality assurance workflow capture
- New employee training material generation

## Features

| Feature | Description |
|---------|-------------|
| **Task Queue** | Display sequential tasks from a configurable task list |
| **Screen Recording** | Capture full screen, window, or tab with high-quality video |
| **Audio Recording** | Capture user narration explaining their actions |
| **Metadata Tracking** | Associate recordings with task IDs, timestamps, and durations |
| **Local Storage** | Save recordings locally before optional cloud sync |
| **Download Export** | Export recordings as `.webm` files with JSON metadata |

## Data Output Format

Each completed task produces:

```
Task_1_2026-02-10T15-30-00.webm      # Screen + audio recording
Task_1_2026-02-10T15-30-00_metadata.json  # Task metadata
```

### Metadata Structure
```json
{
  "taskId": 1,
  "taskText": "Navigate to Amazon and search for 'wireless headphones'",
  "timestamp": "2026-02-10T15:30:00.000Z",
  "duration": 45
}
```

## System Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system diagrams and component descriptions.

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  popup   │  │  tasks   │  │recording │  │ storage  │    │
│  │   .js    │──│   .js    │──│   .js    │──│   .js    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│        │                           │              │          │
│        ▼                           ▼              ▼          │
│  ┌──────────┐              ┌──────────────┐  ┌─────────┐    │
│  │background│              │ MediaRecorder│  │ Chrome  │    │
│  │   .js    │              │     API      │  │ Storage │    │
│  └──────────┘              └──────────────┘  └─────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Prerequisites
- Google Chrome browser
- Google Cloud Console account (for OAuth)

### 2. Google OAuth Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Create a new **OAuth 2.0 Client ID**:
   - Application type: **Chrome Extension**
   - Name: `Web Task Data Collector`
   - Item ID: Your extension ID (see step 4)

### 3. Environment Setup

Create a `.env` file in the project root:
```bash
CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 4. Build & Install

```bash
# Make the build script executable
chmod +x build_extension.sh

# Run the build (this will show your extension ID)
./build_extension.sh
```

Load the extension in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `build` folder

### 5. Configure OAuth with Extension ID

After loading, copy your extension ID from `chrome://extensions/` and add it to your Google Cloud Console OAuth credentials.

## Usage Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  1. Sign In │ ──► │  2. Read    │ ──► │  3. Start   │
│  with Google│     │    Task     │     │  Recording  │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  6. Next    │ ◄── │  5. Download│ ◄── │  4. Complete│
│    Task     │     │  Recording  │     │  & Submit   │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. **Sign In** — Authenticate with Google OAuth
2. **Read Task** — View the current task instruction
3. **Start Recording** — Begin screen + audio capture
4. **Complete Task** — Perform the web task while recording
5. **Submit & Download** — Save locally and download files
6. **Next Task** — Move to the next task in the queue

## Task Configuration

Edit `tasks.txt` to define your task list:

```
Task 1: Navigate to Google and search for "machine learning tutorials"
Task 2: Go to Wikipedia and find the article about "artificial intelligence"
Task 3: Open Amazon and add a book about Python programming to your cart
Task 4: Visit GitHub and star a repository related to web automation
```

## Troubleshooting

### Authentication Issues
| Problem | Solution |
|---------|----------|
| Sign-in fails | Verify `.env` CLIENT_ID matches Google Cloud Console |
| "Invalid client" error | Ensure extension ID in Console matches `chrome://extensions/` |
| Token errors | Clear tokens at `chrome://identity-internals/` |

### Recording Issues
| Problem | Solution |
|---------|----------|
| Screen capture denied | Grant screen sharing permission in Chrome |
| No audio captured | Check microphone permissions in site settings |
| Recording too large | Download immediately; local storage is ~5MB limited |

## Data Storage

| Storage Type | Limit | Purpose |
|--------------|-------|---------|
| Chrome Local | ~5MB | Temporary recording cache |
| Downloaded Files | Unlimited | Permanent export to disk |

## Project Structure

```
pipeline_web_extension/
├── manifest.json       # Extension configuration
├── popup.html          # Extension popup UI
├── popup.js            # UI controller & auth handling
├── background.js       # Service worker (OAuth)
├── tasks.js            # Task queue management
├── recording.js        # Screen/audio capture logic
├── storage.js          # Local storage & file export
├── styles.css          # UI styling
├── tasks.txt           # Configurable task list
├── config.js           # OAuth configuration
├── build_extension.sh  # Build script
├── build/              # Production build output
└── images/             # Extension icons
```

## Contributing

We welcome contributions! Areas of interest:
- Cloud storage integration (GCS, S3)
- DOM event capture alongside video
- Keyboard/mouse action logging
- Multi-browser support

## License

See [LICENSE](./LICENSE) for details.

---

*Built for advancing web agent research through human demonstration collection.*
