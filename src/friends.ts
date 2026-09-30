/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { User } from "@vencord/discord-types";
import { RelationshipStore, UserStore } from "@webpack/common";

import { getKnownMessageTimes } from "./dmTimes";
import { FriendInfo } from "./engine";

export interface ExcludedFriend {
    info: FriendInfo;
    reason: string;
}

function readFriend(id: string, user: User, messageTimes: Map<string, number>): FriendInfo {
    const friendsSince = Date.parse(RelationshipStore.getSince(id));

    return {
        id,
        name: user.globalName || user.username,
        avatarUrl: user.getAvatarURL(undefined, 64, false),
        lastMessageAt: messageTimes.get(id) ?? null,
        friendsSince: Number.isFinite(friendsSince) ? friendsSince : Date.now()
    };
}

function getExclusionReason(id: string, user: User) {
    if (user.bot) return "Bot";
    if (RelationshipStore.isIgnored(id)) return "Ignored";
    if (RelationshipStore.isBlocked(id)) return "Blocked";
    return null;
}

export function getFriendGroups() {
    const messageTimes = getKnownMessageTimes();
    const trackable: FriendInfo[] = [];
    const excluded: ExcludedFriend[] = [];

    for (const id of RelationshipStore.getFriendIDs()) {
        const user = UserStore.getUser(id);
        if (!user) continue;

        const reason = getExclusionReason(id, user);
        if (reason) excluded.push({ info: readFriend(id, user, messageTimes), reason });
        else trackable.push(readFriend(id, user, messageTimes));
    }

    trackable.sort((a, b) => a.name.localeCompare(b.name));
    return { trackable, excluded };
}

export function getFriends() {
    return getFriendGroups().trackable;
}
