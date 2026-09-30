# Tether architecture

## Module map

```mermaid
flowchart LR
    index["index.tsx<br/>lifecycle, check loop, notifications"] --> backfill
    index --> modal
    index --> chatButton["ChatButton.tsx<br/>chat bar button"]
    index --> friends["friends.ts<br/>friends and timestamps"]
    index --> state["state.ts<br/>per-account persistence"]
    index --> engine["engine.ts<br/>pure rules, no imports"]

    backfill["backfill.ts<br/>paced probes"] --> dmTimes
    backfill --> friends
    backfill --> state

    modal["modal.tsx<br/>check-in and untethered lists"] --> actions
    modal --> dmTimes
    modal --> state
    modal --> engine

    actions["actions.ts<br/>Delay, Untether, Forget"] --> state
    actions --> settings

    settings["settings.tsx<br/>options, intro, section headers"] --> friendManager
    settings --> friendManager
    friendManager["FriendManager.tsx<br/>list, search, diagnostics"] --> friends
    friendManager --> backfill
    friendManager --> dmTimes

    friends --> dmTimes
    dmTimes["dmTimes.ts<br/>timestamp cache, open and close"] --> engine

    onboarding["Onboarding.tsx<br/>first-run modal"] --> state
    onboarding --> settings
    onboarding --> friendPicker["FriendPicker.tsx<br/>whitelist picker modal"]
    friendPicker --> friends
    friendPicker --> state

    state --> engine
```

Dependency rule: `engine.ts` imports nothing. Everything else may import it. No module imports `index.tsx`. `dmTimes.ts` never imports `state.ts`, which is what lets `state.ts` or `index.tsx` reset dmTimes caches without a cycle.

## Runtime data flow

```mermaid
flowchart TD
    subgraph Discord
        stores[ChannelStore, RelationshipStore, UserStore]
        events[Gateway: MESSAGE_CREATE, CONNECTION_OPEN]
    end

    stores --> dmTimes
    events --> dmTimes
    events --> index

    dmTimes["dmTimes.ts<br/>recipient to timestamp map<br/>baseTimes + channelUsers + overlay"] --> friends
    friends --> engine
    engine --> index
    index -->|notification, toast, notice| surfaces[OS toast, corner toast, top notice]
    surfaces --> modal
    modal --> actions
    actions --> state
    state -->|IndexedDB per account| DataStore[(DataStore)]

    backfill -->|one probe per interval| dmTimes
    dmTimes -->|POST DM, read last message, close| DiscordAPI[(Discord API)]
```

## Check-in lifecycle

```mermaid
sequenceDiagram
    participant T as check timer
    participant I as index.tsx
    participant E as engine.ts
    participant S as surfaces
    participant M as modal
    participant ST as state.ts

    T->>I: check()
    I->>I: ensureStateLoaded, rememberLoadedChannels
    I->>E: getOverdueFriends(friends, state, settings)
    E-->>I: sorted overdue list
    I->>E: mostRecentNudgeAt and countNudgedToday
    alt inside cooldown or over daily cap
        I-->>T: stop quietly
    else a nudge is due
        I->>S: notification, toast with actions, optional notice
        I->>ST: lastNudgedAt for the friend
    end
    M->>ST: seenAt on open, notBefore on delay, muted on untether
```

## Backfill lifecycle

```mermaid
sequenceDiagram
    participant B as backfill timer
    participant BF as backfill.ts
    participant D as dmTimes.ts
    participant API as Discord API
    participant ST as state.ts

    B->>BF: runBackfillStep()
    BF->>BF: pause if a Tether channel is on screen
    BF->>BF: first candidate with no history and not checked
    BF->>D: probeConversation(candidate)
    D->>API: POST users/@me/channels
    API-->>D: channel id, last message id
    D->>D: record timestamp, register mapping
    D->>API: silent DELETE unless protected or selected
    D-->>BF: had history or not
    BF->>ST: checkedAt on success, attemptedAt on failure
```

## Storage keys

| Key | Scope | Contents |
| --- | --- | --- |
| `tether-state-<userId>` | per account | notBefore, muted, forgotten, tracked, lastNudgedAt, seenAt, checkedAt, attemptedAt |
| `tether-dm-times-v2-<userId>` | per account | remoteFetchedAt and known last message timestamps |
| `tether-onboarded-v5-<userId>` | per account | one-time onboarding flag |

## Runtime caches, not persisted

| Name | Where | Purpose |
| --- | --- | --- |
| `baseTimes` | dmTimes | timestamps from the DM list and observations |
| `channelUsers` | dmTimes | channel id to person id map |
| `protectedChannels` | dmTimes | channels opened through Tether, never closed by backfill |
