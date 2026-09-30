/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 tan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Logger } from "@utils/Logger";
import { Channel } from "@vencord/discord-types";
import { ChannelActionCreators, ChannelRouter, ChannelStore, RestAPI, SelectedChannelStore, SnowflakeUtils, Toasts, UserStore } from "@webpack/common";

import { FriendInfo, HOUR_MS } from "./engine";

const logger = new Logger("Tether");
const CACHE_TTL_MS = 6 * HOUR_MS;
const FORCE_MIN_INTERVAL_MS = 60_000;
const USER_CHANNELS_ENDPOINT = "/users/@me/channels";
const DM_CHANNEL_TYPE = 1;

interface RawDMChannel {
    id?: string;
    type: number;
    owner_id?: string | null;
    last_message_id?: string | null;
    recipients?: Array<{ id?: string; }>;
}

interface DMTimesCache {
    fetchedAt: number;
    times: Record<string, number>;
}

interface ChannelStoreLike {
    getMutablePrivateChannels?(): Record<string, Channel>;
    getSortedPrivateChannels?(): Channel[];
    getDMUserIds?(): string[];
    getDMFromUserId?(userId: string): string | undefined;
    getDMChannelFromUserId?(userId: string): Channel | undefined;
}

export interface DMSyncStatus {
    cached: number;
    loaded: number;
    mapped: number;
    lastSyncCount: number | null;
    lastError: string | null;
}

let baseTimes = new Map<string, number>();
const channelUsers = new Map<string, string>();
const protectedChannels = new Set<string>();
const recentSelections = new Map<string, number>();
const SELECTION_GRACE_MS = 120_000;
let remoteFetchedAt = 0;
let lastSyncCount: number | null = null;
let lastError: string | null = null;

export function resetRuntimeCaches() {
    baseTimes = new Map();
    channelUsers.clear();
    protectedChannels.clear();
    recentSelections.clear();
    remoteFetchedAt = 0;
    lastSyncCount = null;
    lastError = null;
}

function cacheKey() {
    const userId = UserStore.getCurrentUser()?.id ?? "unknown";
    return `tether-dm-times-v2-${userId}`;
}

function readId(value: unknown) {
    if (value && typeof value === "object" && "id" in value) {
        const { id } = (value as { id: unknown; });
        if (typeof id === "string") return id;
    }

    return null;
}

function getRecipientId(channel: Channel) {
    const candidates = [
        channel.recipients as unknown[] | undefined,
        channel.rawRecipients as unknown[] | undefined
    ];

    for (const recipients of candidates) {
        if (!Array.isArray(recipients) || recipients.length !== 1) continue;

        const [recipient] = recipients;
        const id = typeof recipient === "string" ? recipient : readId(recipient);
        if (id && id !== UserStore.getCurrentUser()?.id) return id;
    }

    return null;
}

function resolveRecipient(channelId: string) {
    const known = channelUsers.get(channelId);
    if (known) return known;

    const channel = ChannelStore.getChannel(channelId);
    if (!channel || channel.type !== DM_CHANNEL_TYPE) return null;

    return getRecipientId(channel);
}

function addChannel(target: Map<string, number>, channel: Channel | undefined) {
    if (!channel || !channel.lastMessageId || channel.type !== DM_CHANNEL_TYPE) return;

    const recipientId = getRecipientId(channel);
    if (!recipientId) return;

    channelUsers.set(channel.id, recipientId);

    const timestamp = SnowflakeUtils.extractTimestamp(channel.lastMessageId);
    if (timestamp <= (target.get(recipientId) ?? 0)) return;

    target.set(recipientId, timestamp);
}

function getPrivateChannels() {
    const store = ChannelStore as unknown as ChannelStoreLike;

    if (typeof store.getMutablePrivateChannels === "function") {
        return Object.values(store.getMutablePrivateChannels());
    }

    if (typeof store.getSortedPrivateChannels === "function") {
        return store.getSortedPrivateChannels();
    }

    return [];
}

function overlayLoadedChannels(target: Map<string, number>) {
    for (const channel of getPrivateChannels()) addChannel(target, channel);

    const store = ChannelStore as unknown as ChannelStoreLike;
    if (typeof store.getDMUserIds === "function" && typeof store.getDMChannelFromUserId === "function") {
        for (const userId of store.getDMUserIds()) addChannel(target, store.getDMChannelFromUserId(userId));
    }
}

export function getLoadedChannelCount() {
    return getPrivateChannels().length;
}

export function isTetherChannel(channelId: string) {
    return protectedChannels.has(channelId);
}

export function markChannelSelected(channelId: string | null | undefined) {
    if (!channelId) return;

    recentSelections.set(channelId, Date.now());

    const cutoff = Date.now() - SELECTION_GRACE_MS;
    for (const [channel, seenAt] of recentSelections) {
        if (seenAt < cutoff) recentSelections.delete(channel);
    }
}

export function registerConversation(channelId: string, userId: string) {
    channelUsers.set(channelId, userId);
}

export function findDirectChannelId(userId: string) {
    for (const channel of getPrivateChannels()) {
        if (channel.type !== DM_CHANNEL_TYPE) continue;
        if (getRecipientId(channel) === userId) return channel.id;
    }

    const store = ChannelStore as unknown as ChannelStoreLike;
    if (typeof store.getDMChannelFromUserId === "function") {
        const channel = store.getDMChannelFromUserId(userId);
        if (channel) return channel.id;
    }

    if (typeof store.getDMFromUserId === "function") {
        const channelId = store.getDMFromUserId(userId);
        if (channelId && ChannelStore.getChannel(channelId)) return channelId;
    }

    for (const [channelId, recipientId] of channelUsers) {
        if (recipientId === userId && ChannelStore.getChannel(channelId)) return channelId;
    }

    return undefined;
}

async function persist() {
    await DataStore.set(cacheKey(), { fetchedAt: remoteFetchedAt, times: Object.fromEntries(baseTimes) });
}

export function recordMessage(channelId: string, messageId: string) {
    const recipientId = resolveRecipient(channelId);
    if (!recipientId) return;

    const timestamp = SnowflakeUtils.extractTimestamp(messageId);
    if (timestamp <= (baseTimes.get(recipientId) ?? 0)) return;

    baseTimes.set(recipientId, timestamp);
    void persist();
}

export async function refreshConversation(channelId: string) {
    if (!resolveRecipient(channelId)) return;

    try {
        const { body } = await RestAPI.get({
            url: `/channels/${channelId}/messages`,
            query: { limit: 1 },
            oldFormErrors: true
        });

        const message = Array.isArray(body) ? body[0] : undefined;
        if (message?.id) recordMessage(channelId, message.id);
    } catch (error) {
        logger.error("Could not refresh the conversation", error);
    }
}

export async function refreshCurrentConversation() {
    const channelId = SelectedChannelStore.getChannelId();
    if (channelId) await refreshConversation(channelId);
}

interface PrivateChannelActions {
    openPrivateChannel?(args: { recipientIds: string[]; }): Promise<string | undefined>;
    getDMChannel?(channelId: string): Promise<string | undefined>;
}

async function createConversation(friendId: string, name: string) {
    const actions = ChannelActionCreators as unknown as PrivateChannelActions;

    try {
        if (typeof actions.openPrivateChannel !== "function") {
            const { body } = await RestAPI.post({
                url: "/users/@me/channels",
                body: { recipients: [friendId] },
                oldFormErrors: true
            });

            if (!body?.id) throw new Error("Discord did not return a conversation");

            registerConversation(body.id, friendId);
            protectedChannels.add(body.id);
            if (body.last_message_id) recordMessage(body.id, body.last_message_id);

            ChannelRouter.transitionToChannel(body.id);
            return;
        }

        const channelId = await actions.openPrivateChannel({ recipientIds: [friendId] });
        if (!channelId) throw new Error("Discord did not return a conversation");

        registerConversation(channelId, friendId);
        protectedChannels.add(channelId);

        if (typeof actions.getDMChannel === "function") {
            await actions.getDMChannel(channelId).catch(() => void 0);
        }

        logger.info(`Opened ${friendId} in channel ${channelId}, in store: ${Boolean(ChannelStore.getChannel(channelId))}, private: ${getPrivateChannels().some(channel => channel.id === channelId)}`);

        void refreshConversation(channelId);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger.error(`Could not open a conversation with ${name}`, error);
        Toasts.show({
            message: `Could not open the chat with ${name}: ${reason.slice(0, 120)}`,
            type: Toasts.Type.FAILURE,
            id: Toasts.genId()
        });
    }
}

export function openConversation(friend: FriendInfo) {
    const channelId = findDirectChannelId(friend.id);
    logger.info(`Open conversation: ${friend.name} (${friend.id}), channel ${channelId ?? "none"}`);

    if (channelId) {
        registerConversation(channelId, friend.id);
        protectedChannels.add(channelId);

        try {
            ChannelRouter.transitionToChannel(channelId);
            void refreshConversation(channelId);
            return;
        } catch (error) {
            logger.error("Could not navigate to the conversation, falling back", error);
        }
    }

    void createConversation(friend.id, friend.name);
}

function closeProbedChannel(channelId: string) {
    if (protectedChannels.has(channelId)) {
        logger.info(`Keeping channel ${channelId} open, it was opened through Tether`);
        return;
    }

    if (channelId === SelectedChannelStore.getChannelId()) {
        logger.info(`Keeping channel ${channelId} open, it is currently selected`);
        return;
    }

    const selectedAt = recentSelections.get(channelId);
    if (selectedAt != null && Date.now() - selectedAt < SELECTION_GRACE_MS) {
        logger.info(`Keeping channel ${channelId} open, it was opened recently`);
        return;
    }

    logger.info(`Closing probed channel ${channelId}`);
    void RestAPI.del({ url: `/channels/${channelId}`, query: { silent: true } }).catch(() => void 0);
}

export async function probeConversation(friend: FriendInfo) {
    try {
        const { body } = await RestAPI.post({
            url: "/users/@me/channels",
            body: { recipients: [friend.id] },
            oldFormErrors: true
        });

        if (!body?.id) return null;

        registerConversation(body.id, friend.id);

        if (body.last_message_id) recordMessage(body.id, body.last_message_id);

        closeProbedChannel(body.id);

        return Boolean(body.last_message_id);
    } catch (error) {
        logger.error(`Could not check the history for ${friend.name}`, error);
        return null;
    }
}

async function fetchDMTimes() {
    const response = await RestAPI.get({ url: USER_CHANNELS_ENDPOINT, oldFormErrors: true });
    const body = response?.body;

    if (!Array.isArray(body)) {
        throw new Error(`Unexpected DM list response: ${JSON.stringify(body).slice(0, 200)}`);
    }

    const fetched = new Map<string, number>();
    const selfId = UserStore.getCurrentUser()?.id;

    for (const channel of body as RawDMChannel[]) {
        const recipientId = channel.recipients?.[0]?.id;
        if (channel.type !== DM_CHANNEL_TYPE || channel.owner_id) continue;
        if (channel.recipients?.length !== 1 || !recipientId || recipientId === selfId) continue;

        if (channel.id) channelUsers.set(channel.id, recipientId);
        if (!channel.last_message_id) continue;

        const timestamp = SnowflakeUtils.extractTimestamp(channel.last_message_id);
        if (timestamp > (fetched.get(recipientId) ?? 0)) fetched.set(recipientId, timestamp);
    }

    return fetched;
}

export async function syncDMTimes(force = false) {
    const cached = await DataStore.get<DMTimesCache>(cacheKey());
    if (cached) {
        baseTimes = new Map(Object.entries(cached.times));
        remoteFetchedAt = cached.fetchedAt;
    }

    const minInterval = force ? FORCE_MIN_INTERVAL_MS : CACHE_TTL_MS;
    if (remoteFetchedAt && Date.now() - remoteFetchedAt <= minInterval) return;

    try {
        const fetched = await fetchDMTimes();
        lastSyncCount = fetched.size;
        lastError = null;

        if (fetched.size === 0) {
            logger.warn("Discord returned an empty DM list, keeping locally loaded channels only");
            return;
        }

        for (const [id, timestamp] of fetched) {
            if (timestamp > (baseTimes.get(id) ?? 0)) baseTimes.set(id, timestamp);
        }

        remoteFetchedAt = Date.now();
        overlayLoadedChannels(baseTimes);
        await persist();
    } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        logger.error("Could not fetch the DM list from Discord, using locally loaded channels only", error);
    }
}

export async function rememberLoadedChannels() {
    const before = baseTimes.size;
    overlayLoadedChannels(baseTimes);
    if (baseTimes.size !== before) await persist();
}

export function getDMSyncStatus(): DMSyncStatus {
    return {
        cached: baseTimes.size,
        loaded: getLoadedChannelCount(),
        mapped: channelUsers.size,
        lastSyncCount,
        lastError
    };
}

export function getKnownMessageTimes() {
    const times = new Map(baseTimes);
    overlayLoadedChannels(times);
    return times;
}
