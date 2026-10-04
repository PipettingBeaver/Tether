/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { currentNotice, noticesQueue } from "@api/Notices";
import { showNotification } from "@api/Notifications";
import { SettingsStore } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { ApplicationCommandInputType } from "@vencord/discord-types/enums";
import { ChannelStore, UserStore } from "@webpack/common";

import { scheduleBackfill, stopBackfill } from "./backfill";
import { TetherButton, TetherIcon } from "./ChatButton";
import { markChannelSelected, openConversation, recordMessage, refreshConversation, rememberLoadedChannels, syncDMTimes } from "./dmTimes";
import { countNudgedToday, formatDaysAgo, getOverdueFriends, HOUR_MS, MINUTE_MS, mostRecentNudgeAt } from "./engine";
import { getFriends } from "./friends";
import { openTether, openTetherModal } from "./modal";
import { showTetherNotice } from "./notices";
import { maybeShowOnboarding } from "./Onboarding";
import settings from "./settings";
import { ensureStateLoaded, getState, patchFriendState, saveState } from "./state";

const logger = new Logger("Tether");

let checkTimer: ReturnType<typeof setInterval>;
let firstCheckTimer: ReturnType<typeof setTimeout>;
let onboardingTimer: ReturnType<typeof setTimeout>;
let checking = false;

async function loadPrivateChannels() {
    const load = ChannelStore.loadAllGuildAndPrivateChannelsFromDisk;
    if (typeof load !== "function") return;

    await load.call(ChannelStore).catch(() => void 0);
}

async function check() {
    if (checking || !UserStore.getCurrentUser()) return;

    checking = true;
    try {
        await ensureStateLoaded();
        await rememberLoadedChannels();

        const friends = getFriends();
        const now = Date.now();
        const cooldownMs = settings.store.notificationCooldownHours * HOUR_MS;
        if (now - mostRecentNudgeAt(friends, getState()) < cooldownMs) return;

        const overdue = getOverdueFriends(friends, getState(), settings.store, now);
        if (overdue.length === 0) return;

        const remainingToday = settings.store.dailyCheckIns - countNudgedToday(friends, getState(), now);
        if (remainingToday <= 0) return;

        const [most] = overdue;
        const waiting = overdue.length - 1;
        const more = waiting === 0
            ? ""
            : waiting === 1
                ? " 1 more friend is waiting."
                : ` ${waiting} more friends are waiting.`;
        const { lastMessageAt } = most;
        const title = lastMessageAt == null ? `Say hi to ${most.name}?` : `How's ${most.name} doing?`;
        const body = lastMessageAt == null
            ? `You became friends ${formatDaysAgo(most.friendsSince)} and have not talked yet. Click to say hi!${more}`
            : `Last message ${formatDaysAgo(lastMessageAt)}. Click to open the chat.${more}`;

        showNotification({
            title,
            body,
            icon: most.avatarUrl,
            onClick: () => openConversation(most)
        });

        if (settings.store.inAppNotice && !currentNotice && noticesQueue.length === 0) {
            showTetherNotice(most.id, `${title} ${body}`, () => {
                try {
                    openTetherModal(most.id);
                } catch (error) {
                    logger.error("Could not open the Tether window", error);
                }
            });
        }

        patchFriendState(most.id, { lastNudgedAt: now });
        await saveState();
    } finally {
        checking = false;
    }
}

async function init() {
    if (!UserStore.getCurrentUser()) return;
    await loadPrivateChannels();
    await syncDMTimes();
    await ensureStateLoaded();
    scheduleFirstCheck();
}

function scheduleFirstCheck() {
    clearTimeout(firstCheckTimer);
    firstCheckTimer = setTimeout(() => void check(), Math.max(0, settings.store.startupDelayMinutes) * MINUTE_MS);
}

function scheduleChecks() {
    clearInterval(checkTimer);
    checkTimer = setInterval(() => void check(), Math.max(1, settings.store.checkIntervalMinutes) * MINUTE_MS);
    scheduleFirstCheck();
}

function onSettingsChanged() {
    scheduleChecks();
    scheduleBackfill();
}

export default definePlugin({
    name: "Tether",
    description: "Checks in when you haven't talked to a friend in a while. Uses local DM timestamps.",
    tags: ["Friends", "Notifications", "Utility"],
    authors: [{ name: "tan", id: BigInt(0) }],
    enabledByDefault: true,

    settings,

    chatBarButton: {
        icon: TetherIcon,
        render: TetherButton
    },

    commands: [{
        name: "tether",
        description: "See friends you haven't talked to in a while",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute: () => void openTether()
    }],

    flux: {
        CONNECTION_OPEN() {
            void init();
        },
        CHANNEL_SELECT({ channelId }: { channelId?: string | null; }) {
            markChannelSelected(channelId);
            if (channelId) void refreshConversation(channelId);
        },
        MESSAGE_CREATE({ message }: { message: { id: string; channel_id: string; author?: { id?: string; }; }; }) {
            recordMessage(message.channel_id, message.id, message.author?.id === UserStore.getCurrentUser()?.id);
        }
    },

    start() {
        scheduleChecks();
        scheduleBackfill();
        onboardingTimer = setTimeout(() => void maybeShowOnboarding(), 4_000);
        SettingsStore.addPrefixChangeListener("plugins.Tether", onSettingsChanged);
    },

    stop() {
        clearTimeout(firstCheckTimer);
        clearTimeout(onboardingTimer);
        clearInterval(checkTimer);
        stopBackfill();
        SettingsStore.removePrefixChangeListener("plugins.Tether", onSettingsChanged);
        checking = false;
    }
});
