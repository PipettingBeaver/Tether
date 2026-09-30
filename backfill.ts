/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { SelectedChannelStore, UserStore } from "@webpack/common";

import { isTetherChannel, probeConversation } from "./dmTimes";
import { HOUR_MS } from "./engine";
import { getFriends } from "./friends";
import settings from "./settings";
import { ensureStateLoaded, getState, patchFriendState, saveState } from "./state";

const logger = new Logger("Tether");
const RETRY_MS = 6 * HOUR_MS;

let timer: ReturnType<typeof setInterval> | undefined;

export async function runBackfillStep(force = false) {
    const perHour = Math.floor(settings.store.backfillPerHour ?? 0);
    if (!force && perHour <= 0) return;
    if (!UserStore.getCurrentUser()) return;

    await ensureStateLoaded();

    const selected = SelectedChannelStore.getChannelId();
    if (selected && isTetherChannel(selected)) {
        logger.info("Backfill: paused while a Tether-opened chat is on screen");
        return;
    }

    const retryBefore = Date.now() - RETRY_MS;
    const waiting = getFriends().filter(friend => {
        const state = getState()[friend.id];
        if (friend.lastMessageAt != null || state?.checkedAt) return false;

        return force || (state?.attemptedAt ?? 0) < retryBefore;
    });

    logger.info(`Backfill: ${waiting.length} friends waiting`);

    const [candidate] = waiting;
    if (!candidate) {
        logger.info("Backfill: nothing left to check");
        return;
    }

    logger.info(`Backfill: probing ${candidate.name} (${candidate.id})`);

    const hadHistory = await probeConversation(candidate);
    if (hadHistory == null) {
        patchFriendState(candidate.id, { attemptedAt: Date.now() });
        logger.warn(`Backfill: could not check ${candidate.name}, will retry later`);
    } else {
        patchFriendState(candidate.id, { checkedAt: Date.now() });
        logger.info(`Backfill: checked ${candidate.name}`);
    }

    await saveState();
}

export function getBackfillQueueSize() {
    return getFriends().filter(friend => {
        const state = getState()[friend.id];
        return friend.lastMessageAt == null && !state?.checkedAt;
    }).length;
}

export function scheduleBackfill() {
    if (timer) clearInterval(timer);
    timer = undefined;

    const perHour = Math.floor(settings.store.backfillPerHour ?? 0);
    if (perHour <= 0) return;

    timer = setInterval(() => void runBackfillStep(), Math.max(10_000, Math.round(3_600_000 / perHour)));
}

export function stopBackfill() {
    if (timer) clearInterval(timer);
    timer = undefined;
}
