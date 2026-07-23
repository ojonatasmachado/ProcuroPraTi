export const createChatId = (firstParticipantId, secondParticipantId, procuraId = null) => {
  const participants = [String(firstParticipantId), String(secondParticipantId)]
    .sort((first, second) => first.localeCompare(second))
    .map(encodeURIComponent)
    .join('::');
  return procuraId ? `${participants}::${encodeURIComponent(String(procuraId))}` : participants;
};

export const hasBuyerStartedConversation = (chats, companyId, buyerId, procuraId) => {
  if (!procuraId) return false;
  const chatId = createChatId(companyId, buyerId, procuraId);
  const messages = Array.isArray(chats?.[chatId]) ? chats[chatId] : [];
  return messages.some(message => message.senderId === buyerId && message.receiverId === companyId);
};

export const normalizeChats = (chats) => {
  const normalized = {};
  const messageLists = chats && typeof chats === 'object' ? Object.values(chats) : [];

  messageLists.flat().forEach((message) => {
    if (!message?.senderId || !message?.receiverId) return;
    const chatId = createChatId(message.senderId, message.receiverId, message.procuraId);
    const normalizedMessage = { ...message, chatId };
    if (!normalized[chatId]) normalized[chatId] = [];
    normalized[chatId].push(normalizedMessage);
  });

  Object.values(normalized).forEach((messages) => {
    messages.sort((first, second) => new Date(first.timestamp) - new Date(second.timestamp));
  });

  return normalized;
};
