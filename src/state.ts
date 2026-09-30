/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { UserStore } from "@webpack/common";

import { resetRuntimeCaches } from "./dmTimes";
import { FriendState, TetherState } from "./engine";

let state: TetherState = {};
let pendingSave: Promise<void> = Promise.resolve();
let loadedUser: string | undefined;

function currentUserId() {
    return UserStore.getCurrentUser()?.id ?? "unknown";
}

function stateKey(userId: string) {
    return `tether-state-${userId}`;
}

function onboardedKey(userId: string) {
    return `tether-onboarded-v5-${userId}`;
}

export async function hasOnboarded() {
    return Boolean(await DataStore.get(onboardedKey(currentUserId())));
}

export async function markOnboarded() {
    await DataStore.set(onboardedKey(currentUserId()), true);
}

export async function loadState() {
    await pendingSave.catch(() => void 0);

    const userId = currentUserId();
    if (loadedUser !== undefined && loadedUser !== userId) resetRuntimeCaches();
    state = await DataStore.get<TetherState>(stateKey(userId)) ?? {};
    loadedUser = userId;
}

export async function ensureStateLoaded() {
    if (currentUserId() === loadedUser) return;
    await loadState();
}

export function getState() {
    return state;
}

export function patchFriendState(userId: string, patch: FriendState | null) {
    if (patch === null) {
        delete state[userId];
        return;
    }

    state[userId] = { ...state[userId], ...patch };
}

export function saveState() {
    const userId = currentUserId();
    if (userId !== loadedUser) return pendingSave;

    const snapshot = { ...state };
    pendingSave = pendingSave
        .catch(() => void 0)
        .then(() => DataStore.set(stateKey(userId), snapshot));

    return pendingSave;
}
