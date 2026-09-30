/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { OptionType } from "@utils/types";

import { ListMode } from "./engine";
import FriendManager from "./FriendManager";

function SettingsIntro() {
    return (
        <Flex flexDirection="column" gap="8px" alignItems="flex-start">
            <Paragraph>Pick a list mode below. Tether starts checking in after the startup delay.</Paragraph>
            <Paragraph>Tether is lightweight. If you have been on Discord for a while and have more than 128 conversations, it will gradually fill in the backlog once and recall older ones.</Paragraph>
            <Paragraph>There is also a manual Tether button in the chat window, the knot icon next to the message box.</Paragraph>
        </Flex>
    );
}

function VariablesHeader() {
    return <HeadingSecondary>You can manually configure variables below</HeadingSecondary>;
}

export default definePluginSettings({
    intro: {
        type: OptionType.COMPONENT,
        component: SettingsIntro
    },
    listMode: {
        type: OptionType.SELECT,
        description: "Friends Tether checks in about",
        options: [
            {
                label: "Whitelist only",
                value: "whitelist" as ListMode,
                default: true
            },
            {
                label: "Everyone except friends switched off",
                value: "all" as ListMode
            },
            {
                label: "Recent friends only",
                value: "recent" as ListMode
            },
            {
                label: "Recent and old friends",
                value: "old" as ListMode
            }
        ]
    },
    recentDays: {
        type: OptionType.NUMBER,
        description: "How far back counts as recent, in days",
        default: 21
    },
    oldFriendsDays: {
        type: OptionType.NUMBER,
        description: "How far back counts as an old friend, in days",
        default: 1095
    },
    friends: {
        type: OptionType.COMPONENT,
        component: FriendManager
    },
    variablesHeader: {
        type: OptionType.COMPONENT,
        component: VariablesHeader
    },
    startupDelayMinutes: {
        type: OptionType.NUMBER,
        description: "How long to wait after Discord starts before the first check, in minutes",
        default: 1
    },
    thresholdDays: {
        type: OptionType.NUMBER,
        description: "How many days without a message before Tether checks in",
        default: 7
    },
    dailyCheckIns: {
        type: OptionType.NUMBER,
        description: "How many check-ins Tether may send per day",
        default: 3
    },
    notificationCooldownHours: {
        type: OptionType.NUMBER,
        description: "How many hours between check-ins",
        default: 6
    },
    trackNeverMessaged: {
        type: OptionType.BOOLEAN,
        description: "Also check in about friends with no known message history. This can get noisy",
        default: false
    },
    neverMessagedDays: {
        type: OptionType.NUMBER,
        description: "How many days you must be friends before a first check-in with someone you have never messaged",
        default: 14
    },
    delayDays: {
        type: OptionType.NUMBER,
        description: "How many days Delay Tether silences someone",
        default: 3
    },
    inAppNotice: {
        type: OptionType.BOOLEAN,
        description: "Show a notice at the top of the app until you review it",
        default: true
    },
    chatButton: {
        type: OptionType.BOOLEAN,
        description: "Show the manual Tether button in the chat window. Needs a restart",
        default: true,
        restartNeeded: true
    },
    checkIntervalMinutes: {
        type: OptionType.NUMBER,
        description: "How often Tether checks in the background, in minutes",
        default: 60
    },
    backfillPerHour: {
        type: OptionType.NUMBER,
        description: "How many friends with no known history to check each hour. Set to 0 to turn this off",
        default: 30
    }
});
