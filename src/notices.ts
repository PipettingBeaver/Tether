/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { currentNotice, popNotice, showNotice } from "@api/Notices";

let noticeFriendId: string | null = null;
let noticeHandler: (() => void) | null = null;

export function showTetherNotice(friendId: string, text: string, onReview: () => void) {
    const handler = () => {
        noticeFriendId = null;
        noticeHandler = null;
        popNotice();
        onReview();
    };

    noticeFriendId = friendId;
    noticeHandler = handler;
    showNotice(text, "Review", handler);
}

export function dismissTetherNotice(friendId: string) {
    const isOurs = noticeFriendId === friendId && currentNotice != null && currentNotice[3] === noticeHandler;

    noticeFriendId = null;
    noticeHandler = null;

    if (isOurs) popNotice();
}
