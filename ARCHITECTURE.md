# System Architecture

This document describes the technical architecture of the Web Task Data Collector extension.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CHROME BROWSER                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         EXTENSION CONTEXT                              │  │
│  │                                                                        │  │
│  │   ┌─────────────┐      ┌─────────────────────────────────────────┐   │  │
│  │   │   POPUP     │      │           BACKGROUND SERVICE             │   │  │
│  │   │   (UI)      │◄────►│              WORKER                      │   │  │
│  │   │             │      │                                          │   │  │
│  │   │ ┌─────────┐ │      │  ┌──────────────────────────────────┐   │   │  │
│  │   │ │popup.js │ │      │  │         background.js              │   │   │  │
│  │   │ └─────────┘ │      │  │                                    │   │   │  │
│  │   │ ┌─────────┐ │      │  │  • OAuth Token Management          │   │   │  │
│  │   │ │tasks.js │ │      │  │  • User Info Retrieval             │   │   │  │
│  │   │ └─────────┘ │      │  │  • Side Panel Control              │   │   │  │
│  │   │ ┌─────────┐ │      │  │                                    │   │   │  │
│  │   │ │recording│ │      │  └──────────────────────────────────┘   │   │  │
│  │   │ │  .js    │ │      │                    │                     │   │  │
│  │   │ └─────────┘ │      │                    ▼                     │   │  │
│  │   │ ┌─────────┐ │      │        ┌───────────────────┐            │   │  │
│  │   │ │storage  │ │      │        │  Chrome Identity  │            │   │  │
│  │   │ │  .js    │ │      │        │       API         │            │   │  │
│  │   │ └─────────┘ │      │        └───────────────────┘            │   │  │
│  │   └─────────────┘      └─────────────────────────────────────────┘   │  │
│  │          │                                                            │  │
│  │          ▼                                                            │  │
│  │   ┌─────────────────────────────────────────────────────────────┐    │  │
│  │   │                    BROWSER APIs                              │    │  │
│  │   │                                                              │    │  │
│  │   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │  │
│  │   │  │   Desktop    │  │   Media      │  │    Chrome        │   │    │  │
│  │   │  │   Capture    │  │   Recorder   │  │    Storage       │   │    │  │
│  │   │  │     API      │  │     API      │  │      API         │   │    │  │
│  │   │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │  │
│  │   └─────────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                 │
│                                                                              │
│   ┌────────────────────┐         ┌────────────────────────────────┐         │
│   │   Google OAuth     │         │         Local File System       │         │
│   │     Server         │         │                                 │         │
│   │                    │         │   ┌────────────────────────┐   │         │
│   │  • Authentication  │         │   │    Downloaded Files     │   │         │
│   │  • Token Refresh   │         │   │                         │   │         │
│   │  • User Info API   │         │   │  • .webm recordings     │   │         │
│   │                    │         │   │  • .json metadata       │   │         │
│   └────────────────────┘         │   └────────────────────────┘   │         │
│                                  └────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Popup UI Layer

The popup interface is the user-facing component that coordinates all functionality.

```
┌─────────────────────────────────────────────────────────────┐
│                      popup.html                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Authentication Section                 │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  [Sign in with Google]  |  user@email.com       │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │                    Task Section                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Current Task:                                   │  │  │
│  │  │  "Navigate to Amazon and search for..."          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │                 Recording Controls                     │  │
│  │  ┌────────┐  ┌───────┐  ┌────────┐  ┌──────────┐     │  │
│  │  │ START  │  │ STOP  │  │ SUBMIT │  │ DOWNLOAD │     │  │
│  │  └────────┘  └───────┘  └────────┘  └──────────┘     │  │
│  │                     [NEXT TASK]                        │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │                  Status Display                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Timer: 02:35  |  Status: Recording...          │  │  │
│  │  │  [████████░░░░░░] Audio Level                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Module Responsibilities

```
┌──────────────────────────────────────────────────────────────────┐
│                        MODULE OVERVIEW                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐     Responsibilities:                        │
│  │    popup.js     │     • Initialize DOM event listeners         │
│  │                 │     • Coordinate authentication flow          │
│  │   [Controller]  │     • Manage UI state transitions             │
│  └────────┬────────┘     • Handle button click events              │
│           │                                                        │
│           ▼                                                        │
│  ┌─────────────────┐     Responsibilities:                        │
│  │    tasks.js     │     • Load tasks from tasks.txt               │
│  │                 │     • Track current task index                │
│  │  [Task Manager] │     • Display task instructions               │
│  └────────┬────────┘     • Save task completion status             │
│           │                                                        │
│           ▼                                                        │
│  ┌─────────────────┐     Responsibilities:                        │
│  │  recording.js   │     • Request screen capture permission       │
│  │                 │     • Request microphone access               │
│  │   [Recorder]    │     • Combine A/V streams                     │
│  └────────┬────────┘     • Manage MediaRecorder lifecycle          │
│           │              • Display audio level indicator           │
│           ▼                                                        │
│  ┌─────────────────┐     Responsibilities:                        │
│  │   storage.js    │     • Convert blob to base64                  │
│  │                 │     • Save to Chrome local storage            │
│  │    [Storage]    │     • Create downloadable URLs                │
│  └────────┬────────┘     • Clean up old recordings                 │
│           │                                                        │
│           ▼                                                        │
│  ┌─────────────────┐     Responsibilities:                        │
│  │  background.js  │     • Handle OAuth authentication             │
│  │                 │     • Fetch user info from Google             │
│  │ [Service Worker]│     • Respond to popup messages               │
│  └─────────────────┘     • Manage side panel                       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 3. Data Flow Diagrams

#### Authentication Flow

```
┌────────┐         ┌────────┐         ┌──────────┐         ┌────────┐
│  User  │         │ Popup  │         │Background│         │ Google │
└───┬────┘         └───┬────┘         └────┬─────┘         └───┬────┘
    │                  │                   │                   │
    │ Click "Sign In"  │                   │                   │
    │─────────────────►│                   │                   │
    │                  │                   │                   │
    │                  │ sendMessage       │                   │
    │                  │ {authenticate}    │                   │
    │                  │──────────────────►│                   │
    │                  │                   │                   │
    │                  │                   │ getAuthToken()    │
    │                  │                   │──────────────────►│
    │                  │                   │                   │
    │                  │                   │     OAuth Flow    │
    │◄─────────────────│◄──────────────────│◄─────────────────►│
    │ OAuth Consent    │                   │                   │
    │─────────────────►│──────────────────►│──────────────────►│
    │                  │                   │                   │
    │                  │                   │   Access Token    │
    │                  │                   │◄──────────────────│
    │                  │                   │                   │
    │                  │                   │ getUserInfo()     │
    │                  │                   │──────────────────►│
    │                  │                   │                   │
    │                  │                   │   User Info       │
    │                  │   sendResponse    │◄──────────────────│
    │                  │◄──────────────────│                   │
    │                  │                   │                   │
    │  Show user email │                   │                   │
    │◄─────────────────│                   │                   │
    │                  │                   │                   │
```

#### Recording Flow

```
┌────────┐     ┌────────┐     ┌──────────┐     ┌───────────┐     ┌─────────┐
│  User  │     │ Popup  │     │Recording │     │ MediaAPIs │     │ Storage │
└───┬────┘     └───┬────┘     └────┬─────┘     └─────┬─────┘     └────┬────┘
    │              │               │                 │                │
    │ Click Start  │               │                 │                │
    │─────────────►│               │                 │                │
    │              │               │                 │                │
    │              │startRecording │                 │                │
    │              │──────────────►│                 │                │
    │              │               │                 │                │
    │              │               │ getUserMedia    │                │
    │              │               │ (microphone)    │                │
    │              │               │────────────────►│                │
    │              │               │                 │                │
    │   Grant mic  │               │◄────────────────│                │
    │◄─────────────│◄──────────────│  Audio Stream   │                │
    │─────────────►│──────────────►│                 │                │
    │              │               │                 │                │
    │              │               │ desktopCapture  │                │
    │              │               │────────────────►│                │
    │              │               │                 │                │
    │ Select screen│               │◄────────────────│                │
    │◄─────────────│◄──────────────│  Screen Stream  │                │
    │─────────────►│──────────────►│                 │                │
    │              │               │                 │                │
    │              │               │ Create          │                │
    │              │               │ MediaRecorder   │                │
    │              │               │────────────────►│                │
    │              │               │                 │                │
    │              │ Recording...  │◄────────────────│                │
    │◄─────────────│◄──────────────│                 │                │
    │              │               │                 │                │
    │ Click Stop   │               │                 │                │
    │─────────────►│──────────────►│                 │                │
    │              │               │ recorder.stop() │                │
    │              │               │────────────────►│                │
    │              │               │                 │                │
    │              │               │  Recorded Blob  │                │
    │              │               │◄────────────────│                │
    │              │               │                 │                │
    │ Click Submit │               │                 │                │
    │─────────────►│──────────────►│                 │                │
    │              │               │                 │                │
    │              │               │ uploadRecording │                │
    │              │               │─────────────────│───────────────►│
    │              │               │                 │                │
    │              │               │                 │ saveLocally()  │
    │              │               │                 │ createURLs()   │
    │              │               │◄────────────────│◄───────────────│
    │              │               │                 │                │
    │ Click        │               │                 │                │
    │ Download     │               │                 │                │
    │─────────────►│──────────────►│─────────────────│───────────────►│
    │              │               │                 │                │
    │              │               │                 │ trigger <a>    │
    │   Save files │               │                 │ downloads      │
    │◄─────────────│◄──────────────│◄────────────────│◄───────────────│
    │              │               │                 │                │
```

### 4. State Machine

```
                              ┌─────────────────┐
                              │   INITIAL       │
                              │ (Unauthenticated│
                              └────────┬────────┘
                                       │
                                       │ Sign in with Google
                                       ▼
                              ┌─────────────────┐
                              │ AUTHENTICATED   │
                              │ (Ready to start)│
                              └────────┬────────┘
                                       │
                                       │ Load tasks
                                       ▼
         ┌────────────────────────────────────────────────────────┐
         │                    TASK LOOP                            │
         │                                                         │
         │    ┌─────────────────┐                                  │
         │    │  TASK_DISPLAY   │◄──────────────────────┐          │
         │    │ (Showing task)  │                       │          │
         │    └────────┬────────┘                       │          │
         │             │                                │          │
         │             │ Click "Start Recording"        │          │
         │             ▼                                │          │
         │    ┌─────────────────┐                       │          │
         │    │   RECORDING     │                       │          │
         │    │ (Capturing A/V) │                       │          │
         │    └────────┬────────┘                       │          │
         │             │                                │          │
         │             │ Click "Stop"                   │          │
         │             ▼                                │          │
         │    ┌─────────────────┐                       │          │
         │    │   STOPPED       │                       │          │
         │    │ (Ready submit)  │                       │          │
         │    └────────┬────────┘                       │          │
         │             │                                │          │
         │             │ Click "Submit"                 │          │
         │             ▼                                │          │
         │    ┌─────────────────┐                       │          │
         │    │   SUBMITTED     │                       │          │
         │    │ (Saved locally) │                       │          │
         │    └────────┬────────┘                       │          │
         │             │                                │          │
         │             │ Click "Next Task"              │          │
         │             └────────────────────────────────┘          │
         │                                                         │
         └─────────────────────────────────────────────────────────┘
                                       │
                                       │ All tasks completed
                                       ▼
                              ┌─────────────────┐
                              │   COMPLETED     │
                              │ (All tasks done)│
                              └─────────────────┘
```

### 5. Data Pipeline for Web Agent Training

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA COLLECTION PIPELINE                              │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌───────────┐
  │   DEFINE    │      │   COLLECT   │      │  PROCESS    │      │   TRAIN   │
  │   TASKS     │─────►│   DATA      │─────►│  DATA       │─────►│   AGENT   │
  └─────────────┘      └─────────────┘      └─────────────┘      └───────────┘
        │                    │                    │                    │
        ▼                    ▼                    ▼                    ▼
  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
  │ • Task design │  │ • Extension   │  │ • Video →     │  │ • Imitation   │
  │ • Task list   │  │   records     │  │   frames      │  │   learning    │
  │   creation    │  │   human demos │  │ • Audio →     │  │ • Behavioral  │
  │ • Complexity  │  │ • Screen +    │  │   transcript  │  │   cloning     │
  │   balancing   │  │   audio + meta│  │ • Align w/    │  │ • Reward      │
  │               │  │ • Download    │  │   actions     │  │   shaping     │
  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘


                    COLLECTED DATA STRUCTURE

                    ┌─────────────────────────────────────┐
                    │           Per Task Session           │
                    │                                      │
                    │  ┌──────────────────────────────┐   │
                    │  │      Video Recording         │   │
                    │  │  (.webm)                     │   │
                    │  │                              │   │
                    │  │  • Screen pixels over time   │   │
                    │  │  • Visual state changes      │   │
                    │  │  • UI interactions visible   │   │
                    │  └──────────────────────────────┘   │
                    │                                      │
                    │  ┌──────────────────────────────┐   │
                    │  │      Audio Recording         │   │
                    │  │  (embedded in .webm)         │   │
                    │  │                              │   │
                    │  │  • User narration            │   │
                    │  │  • Reasoning explanation     │   │
                    │  │  • Error descriptions        │   │
                    │  └──────────────────────────────┘   │
                    │                                      │
                    │  ┌──────────────────────────────┐   │
                    │  │      Metadata                │   │
                    │  │  (.json)                     │   │
                    │  │                              │   │
                    │  │  • Task ID & description     │   │
                    │  │  • Timestamp (ISO 8601)      │   │
                    │  │  • Duration (seconds)        │   │
                    │  │  • User identifier           │   │
                    │  └──────────────────────────────┘   │
                    │                                      │
                    └─────────────────────────────────────┘
```

### 6. Future Architecture (Planned)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FUTURE ENHANCEMENTS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  CURRENT                              PLANNED
  ─────────                            ───────────

  ┌───────────────┐                    ┌───────────────┐
  │ Screen Video  │       ──────►      │ Screen Video  │
  │ + Audio       │                    │ + Audio       │
  └───────────────┘                    │ + DOM Events  │
                                       │ + Mouse/KB    │
                                       │ + Network Req │
                                       └───────────────┘

  ┌───────────────┐                    ┌───────────────┐
  │ Local Storage │       ──────►      │ Cloud Storage │
  │ (5MB limit)   │                    │ (GCS / S3)    │
  └───────────────┘                    └───────────────┘

  ┌───────────────┐                    ┌───────────────┐
  │ Manual        │       ──────►      │ Automated     │
  │ Download      │                    │ Sync + Batch  │
  └───────────────┘                    └───────────────┘

  ┌───────────────┐                    ┌───────────────┐
  │ Single User   │       ──────►      │ Multi-User    │
  │               │                    │ + Dashboard   │
  └───────────────┘                    └───────────────┘


                    ENHANCED DATA CAPTURE (PLANNED)

        ┌─────────────────────────────────────────────────┐
        │                                                  │
        │   Video Frame     DOM State      Action Log     │
        │   ┌─────────┐     ┌─────────┐    ┌─────────┐   │
        │   │ t=0.0s  │     │ <html>  │    │ click   │   │
        │   │ [frame] │ ──► │  <body> │ ◄──│ x:123   │   │
        │   └─────────┘     │   ...   │    │ y:456   │   │
        │                   └─────────┘    └─────────┘   │
        │        │               │              │        │
        │        └───────────────┼──────────────┘        │
        │                        │                        │
        │                        ▼                        │
        │              ┌─────────────────┐               │
        │              │  Aligned Triple  │               │
        │              │ (frame, DOM,     │               │
        │              │  action)         │               │
        │              └─────────────────┘               │
        │                        │                        │
        │                        ▼                        │
        │              ┌─────────────────┐               │
        │              │  Training Data   │               │
        │              │  for Web Agent   │               │
        │              └─────────────────┘               │
        │                                                  │
        └─────────────────────────────────────────────────┘
```

---

*Architecture designed for scalable web task data collection and web agent training.*
