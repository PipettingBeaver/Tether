/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DAY_MS, FriendInfo } from "./engine";
import settings from "./settings";
import { patchFriendState, saveState } from "./state";

export function delayText(days: number) {
    return days === 1 ? "1 day" : `${days} days`;
}

export function delayFriends(friends: FriendInfo[]) {
    const notBefore = Date.now() + settings.store.delayDays * DAY_MS;

    for (const friend of friends) patchFriendState(friend.id, { notBefore });
    void saveState();
}

export function delayFriend(friend: FriendInfo) {
    delayFriends([friend]);
}

export function untetherFriend(friend: FriendInfo) {
    patchFriendState(friend.id, { muted: true });
    void saveState();
}

export function retetherFriend(id: string) {
    patchFriendState(id, { muted: false, forgotten: false });
    void saveState();
}

export function forgetFriend(id: string) {
    patchFriendState(id, { muted: true, forgotten: true });
    void saveState();
}
