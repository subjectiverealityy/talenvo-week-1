"use client";

import { useState, useCallback, memo } from "react";
import { useShallow } from "zustand/shallow";
import { useStore } from "@/store/store";
import { useAuthor } from "@/app/hooks/useAuthor";
import AuthorModal from "@/components/ui/AuthorModal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import { broadcast } from "@/app/hooks/useWebSocket";

type CommentSectionProps = {
  cardId: string;
};

export default function CommentSection({ cardId }: CommentSectionProps) {
  const {
    author,
    promptForAuthor,
    showAuthorModal,
    handleAuthorConfirm,
    handleAuthorCancel,
  } = useAuthor();

  const { cardCommentMap, createComment } = useStore(
    useShallow((state) => ({
      cardCommentMap: state.cardCommentMap,
      createComment: state.createComment,
    }))
  );

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const topLevelIds = cardCommentMap[cardId] ?? [];

  // Resolves the author — returns existing author or opens the modal.
  // Returns null if the user cancelled the modal.
  async function resolveAuthor(): Promise<string | null> {
    if (author) return author;
    return promptForAuthor();
  }

  const handleSubmitComment = useCallback(
    async (body: string, parentId: string | null) => {
      const resolvedAuthor = await resolveAuthor();
      if (!resolvedAuthor) return;
      const id = crypto.randomUUID();
      createComment({ id, cardId, parentId, author: resolvedAuthor, body });
      void broadcast({ type: "COMMENT_ADDED", payload: { id, cardId, parentId, author: resolvedAuthor, body } });
    },
    [cardId, createComment, author]
  );

  const handleConfirmDelete = useCallback(() => {
    if (!pendingDeleteId) return;
    useStore.getState().deleteComment({ commentId: pendingDeleteId });
    void broadcast({ type: "COMMENT_DELETED", payload: { commentId: pendingDeleteId } });
    setPendingDeleteId(null);
  }, [pendingDeleteId]);

  return (
    <section aria-label="Comments">
      <h3 className="text-sm font-semibold mb-3">
        Comments {topLevelIds.length > 0 && `(${topLevelIds.length})`}
      </h3>

      {topLevelIds.length === 0 && (
        <p className="text-xs text-gray-400 mb-4">
          No comments yet — be the first to add one.
        </p>
      )}

      <ul className="flex flex-col gap-4 mb-4" role="list">
        {topLevelIds.map((commentId) => (
          <CommentThreadWrapper
            key={commentId}
            commentId={commentId}
            currentAuthor={author}
            onRequestDelete={setPendingDeleteId}
            onSubmitComment={handleSubmitComment}
          />
        ))}
      </ul>

      <CommentInput
        onSubmit={(body) => handleSubmitComment(body, null)}
        placeholder="Add a comment..."
        submitLabel="Comment"
      />

      {author && (
        <p className="text-xs text-gray-400 mt-2">
          Commenting as{" "}
          <span className="font-medium text-gray-600">{author}</span>
          {" · "}
          <button
            onClick={() => promptForAuthor()}
            className="underline hover:text-gray-800"
          >
            change
          </button>
        </p>
      )}

      {showAuthorModal && (
        <AuthorModal
          onConfirm={handleAuthorConfirm}
          onCancel={handleAuthorCancel}
        />
      )}

      {pendingDeleteId && (
        <ConfirmDeleteModal
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={handleConfirmDelete}
          itemLabel="comment"
        />
      )}
    </section>
  );
}

// Comment Thread Wrapper - creates stable callback references per commentId so that CommentThread's memo does not re-render when CommentSection re-renders (i.e. when the delete modal opens or closes).
type CommentThreadWrapperProps = {
  commentId: string;
  currentAuthor: string;
  onRequestDelete: (id: string) => void;
  onSubmitComment: (body: string, parentId: string | null) => void;
};

const CommentThreadWrapper = memo(function CommentThreadWrapper({
  commentId,
  currentAuthor,
  onRequestDelete,
  onSubmitComment,
}: CommentThreadWrapperProps) {
  const onReply = useCallback(
    (body: string) => onSubmitComment(body, commentId),
    [commentId, onSubmitComment]
  );

  return (
    <CommentThread
      commentId={commentId}
      currentAuthor={currentAuthor}
      onRequestDelete={onRequestDelete}
      onReply={onReply}
    />
  );
});

// Comment Thread
type CommentThreadProps = {
  commentId: string;
  currentAuthor: string;
  onRequestDelete: (id: string) => void;
  onReply: (body: string) => void;
};

const CommentThread = memo(function CommentThread({
  commentId,
  currentAuthor,
  onRequestDelete,
  onReply,
}: CommentThreadProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);

  const editComment = useStore((state) => state.editComment);
  const replyIds = useStore((state) => state.commentReplyMap[commentId] ?? []);

  const onEdit = useCallback(
    (body: string) => {
      editComment({ commentId, body });
      void broadcast({ type: "COMMENT_EDITED", payload: { commentId, body } });
    },
    [commentId, editComment]
  );

  const onDelete = useCallback(
    () => onRequestDelete(commentId),
    [commentId, onRequestDelete]
  );

  return (
    <li>
      <CommentItem
        commentId={commentId}
        currentAuthor={currentAuthor}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {replyIds.length > 0 && (
        <ul
          className="ml-6 mt-2 flex flex-col gap-2 border-l-2 border-gray-100 pl-4"
          role="list"
          aria-label="Replies"
        >
          {replyIds.map((replyId) => (
            <ReplyItem
              key={replyId}
              replyId={replyId}
              currentAuthor={currentAuthor}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </ul>
      )}

      {showReplyInput ? (
        <div className="ml-6 mt-2">
          <CommentInput
            onSubmit={(body) => {
              onReply(body);
              setShowReplyInput(false);
            }}
            onCancel={() => setShowReplyInput(false)}
            placeholder="Write a reply..."
            submitLabel="Reply"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => setShowReplyInput(true)}
          className="ml-6 mt-1 text-xs text-gray-400 hover:text-gray-700"
        >
          Reply
        </button>
      )}
    </li>
  );
});

// Reply Item
type ReplyItemProps = {
  replyId: string;
  currentAuthor: string;
  onRequestDelete: (id: string) => void;
};

const ReplyItem = memo(function ReplyItem({
  replyId,
  currentAuthor,
  onRequestDelete,
}: ReplyItemProps) {
  const editComment = useStore((state) => state.editComment);

  const onEdit = useCallback(
    (body: string) => {
      editComment({ commentId: replyId, body });
      void broadcast({ type: "COMMENT_EDITED", payload: { commentId: replyId, body } });
    },
    [replyId, editComment]
  );

  const onDelete = useCallback(
    () => onRequestDelete(replyId),
    [replyId, onRequestDelete]
  );

  return (
    <li>
      <CommentItem
        commentId={replyId}
        currentAuthor={currentAuthor}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </li>
  );
});

// Comment Item
type CommentItemProps = {
  commentId: string;
  currentAuthor: string;
  onEdit: (body: string) => void;
  onDelete: () => void;
};

const CommentItem = memo(function CommentItem({
  commentId,
  currentAuthor,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const comment = useStore((state) => state.commentsById[commentId]);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");

  const handleEditSave = useCallback(() => {
    if (!editBody.trim()) return;
    onEdit(editBody.trim());
    setIsEditing(false);
  }, [editBody, onEdit]);

  if (!comment) return null;

  const isOwn = currentAuthor === comment.author;

  return (
    <article aria-label={`Comment by ${comment.author}`}>
      <header className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">
            {comment.author}
          </span>
          <time
            className="text-xs text-gray-400"
            dateTime={comment.createdAt.toISOString()}
          >
            {comment.createdAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </time>
          {comment.editedAt !== null && (
            <span className="text-xs text-gray-400 italic">(edited)</span>
          )}
        </div>

        {isOwn && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditBody(comment.body);
                setIsEditing(true);
              }}
              className="text-xs text-gray-400 hover:text-gray-700"
              aria-label="Edit comment"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-gray-400 hover:text-red-500"
              aria-label="Delete comment"
            >
              Delete
            </button>
          </div>
        )}
      </header>

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            autoFocus
            className="w-full border border-gray-300 rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-400"
            rows={3}
            aria-label="Edit comment body"
          />
          <div className="flex gap-2">
            <button
              onClick={handleEditSave}
              className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap wrap-break-word">
          {comment.body}
        </p>
      )}
    </article>
  );
});

// Comment Input
type CommentInputProps = {
  onSubmit: (body: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
};

function CommentInput({
  onSubmit,
  onCancel,
  placeholder = "Add a comment...",
  submitLabel = "Submit",
  autoFocus = false,
}: CommentInputProps) {
  const [body, setBody] = useState("");

  function handleSubmit() {
    if (!body.trim()) return;
    onSubmit(body.trim());
    setBody("");
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          if (e.key === "Escape" && onCancel) onCancel();
        }}
        className="w-full border border-gray-300 rounded p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-400"
        rows={2}
        aria-label={placeholder}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!body.trim()}
          className="text-xs bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400">Tip: Ctrl/Cmd + Enter to submit</p>
    </div>
  );
}