/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export type ListMode = "whitelist" | "all" | "recent" | "old";

export interface TrackingSettings {
    listMode: ListMode;
    recentDays: number;
    oldFriendsDays: number;
}

export interface EngineSettings extends TrackingSettings {
    thresholdDays: number;
    extraDaysAfterMyMessage: number;
    neverMessagedDays: number;
    trackNeverMessaged: boolean;
    dailyCheckIns: number;
    notificationCooldownHours: number;
}

export interface FriendState {
    notBefore?: number;
    muted?: boolean;
    forgotten?: boolean;
    tracked?: boolean;
    lastNudgedAt?: number;
    seenAt?: number;
    checkedAt?: number;
    attemptedAt?: number;
}

export type TetherState = Record<string, FriendState>;

export interface FriendInfo {
    id: string;
    name: string;
    avatarUrl: string | undefined;
    lastMessageAt: number | null;
    lastMessageFromMe?: boolean;
    friendsSince: number;
}

export function daysSince(timestamp: number, now: number = Date.now()) {
    return Math.floor((now - timestamp) / DAY_MS);
}

export function formatDaysAgo(timestamp: number, now: number = Date.now()) {
    const days = daysSince(timestamp, now);

    if (days <= 0) return "today";
    return days === 1 ? "1 day ago" : `${days} days ago`;
}

function referencePoint(friend: FriendInfo) {
    return friend.lastMessageAt ?? friend.friendsSince;
}

export function isTracked(friend: FriendInfo, state: FriendState | undefined, settings: TrackingSettings, now: number = Date.now()) {
    if (state?.muted || state?.forgotten) return false;
    if (state?.tracked === false) return false;

    if (settings.listMode === "whitelist") return state?.tracked === true;

    const maxDays = settings.listMode === "recent"
        ? settings.recentDays
        : settings.listMode === "old"
            ? settings.oldFriendsDays
            : null;

    if (maxDays != null) {
        return friend.lastMessageAt != null && now - friend.lastMessageAt <= maxDays * DAY_MS;
    }

    return true;
}

export function isDue(friend: FriendInfo, state: FriendState | undefined, settings: EngineSettings, now: number = Date.now()) {
    if (!isTracked(friend, state, settings, now)) return false;
    if (state?.notBefore != null && now < state.notBefore) return false;

    if (friend.lastMessageAt == null) {
        if (!settings.trackNeverMessaged) return false;
        return now - friend.friendsSince >= settings.neverMessagedDays * DAY_MS;
    }

    const extraDays = friend.lastMessageFromMe ? settings.extraDaysAfterMyMessage : 0;
    return now - friend.lastMessageAt >= (settings.thresholdDays + extraDays) * DAY_MS;
}

export function countNudgedToday(friends: FriendInfo[], state: TetherState, now: number = Date.now()) {
    const startOfDay = new Date(now).setHours(0, 0, 0, 0);

    return friends.filter(friend => (state[friend.id]?.lastNudgedAt ?? 0) >= startOfDay).length;
}

export function mostRecentNudgeAt(friends: FriendInfo[], state: TetherState) {
    let latest = 0;

    for (const friend of friends) {
        const friendState = state[friend.id];
        if (!friendState) continue;

        if (friendState.lastNudgedAt != null && friendState.lastNudgedAt > latest) latest = friendState.lastNudgedAt;
        if (friendState.seenAt != null && friendState.seenAt > latest) latest = friendState.seenAt;
    }

    return latest;
}

export function getOverdueFriends(friends: FriendInfo[], state: TetherState, settings: EngineSettings, now: number = Date.now()) {
    return friends
        .filter(friend => isDue(friend, state[friend.id], settings, now))
        .sort((a, b) => referencePoint(a) - referencePoint(b));
}
