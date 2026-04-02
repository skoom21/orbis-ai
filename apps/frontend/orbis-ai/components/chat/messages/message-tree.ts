import type { ChatMessage } from '../types'

export interface MessageTreeNode {
  message: ChatMessage
  parentId: string | null
  childrenIds: string[]
  depth: number
}

export interface MessageTreeResult {
  nodesById: Record<string, MessageTreeNode>
  rootIds: string[]
  latestBranchIds: string[]
}

export const ROOT_PARENT_KEY = '__root__'

function normalizeParentId(message: ChatMessage) {
  if (!message.parent_message_id) return null
  return message.parent_message_id
}

export function buildMessageTree(messages: ChatMessage[]): MessageTreeResult {
  const sorted = [...messages].sort(
    (first, second) =>
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
  )

  const nodesById: Record<string, MessageTreeNode> = {}
  const rootIds: string[] = []

  for (const message of sorted) {
    const parentId = normalizeParentId(message)
    nodesById[message.id] = {
      message,
      parentId,
      childrenIds: [],
      depth: 0,
    }
  }

  for (const message of sorted) {
    const node = nodesById[message.id]
    const parentId = node.parentId

    if (parentId && nodesById[parentId]) {
      const parentNode = nodesById[parentId]
      parentNode.childrenIds.push(message.id)
      node.depth = parentNode.depth + 1
    } else {
      rootIds.push(message.id)
    }
  }

  const latestBranchIds: string[] = []

  const visitLatestBranch = (nodeId: string) => {
    latestBranchIds.push(nodeId)
    const node = nodesById[nodeId]
    if (!node) return
    if (node.childrenIds.length === 0) return

    const latestChildId = node.childrenIds[node.childrenIds.length - 1]
    visitLatestBranch(latestChildId)
  }

  for (const rootId of rootIds) {
    visitLatestBranch(rootId)
  }

  return {
    nodesById,
    rootIds,
    latestBranchIds,
  }
}

export function getLatestBranchMessages(messages: ChatMessage[]) {
  const tree = buildMessageTree(messages)
  return tree.latestBranchIds
    .map((messageId) => tree.nodesById[messageId]?.message)
    .filter((message): message is ChatMessage => Boolean(message))
}

export function getSelectedBranchIds(
  tree: MessageTreeResult,
  selectedSiblingByParent: Record<string, number>
) {
  if (tree.rootIds.length === 0) return []

  const walkBranch = (startMessageId: string) => {
    const branchIds: string[] = []

    let currentMessageId: string | null = startMessageId

    while (currentMessageId) {
      branchIds.push(currentMessageId)
      const node = tree.nodesById[currentMessageId]
      if (!node || node.childrenIds.length === 0) {
        currentMessageId = null
        break
      }

      currentMessageId = pickSibling(node.childrenIds, currentMessageId)
    }

    return branchIds
  }

  const pickSibling = (siblings: string[], parentKey: string) => {
    if (siblings.length === 0) return null

    const selectedIndex = selectedSiblingByParent[parentKey]
    if (selectedIndex === undefined || selectedIndex < 0 || selectedIndex >= siblings.length) {
      return siblings[siblings.length - 1]
    }

    return siblings[selectedIndex]
  }

  if (tree.rootIds.length > 1) {
    const mergedBranchIds = tree.rootIds.flatMap((rootId) => walkBranch(rootId))
    return Array.from(new Set(mergedBranchIds))
  }

  let currentMessageId: string | null = pickSibling(tree.rootIds, ROOT_PARENT_KEY)
  const branchIds: string[] = []

  while (currentMessageId) {
    branchIds.push(currentMessageId)
    const node = tree.nodesById[currentMessageId]
    if (!node || node.childrenIds.length === 0) {
      currentMessageId = null
      break
    }

    currentMessageId = pickSibling(node.childrenIds, currentMessageId)
  }

  return branchIds
}
