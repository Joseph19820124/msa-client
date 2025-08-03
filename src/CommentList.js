import React, { useState, useEffect } from "react";
import axios from "axios";

const CommentList = ({ postId }) => {
  const [comments, setComments] = useState([]);

  const fetchData = async () => {
    const commentsUrl = process.env.REACT_APP_COMMENTS_SERVICE_URL || "http://localhost:4001";
    const res = await axios.get(
      `${commentsUrl}/posts/${postId}/comments`
    );

    setComments(res.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderedComments = comments.map((comment) => {
    return (
      <li key={comment.id} className="comment-item">
        {comment.content}
      </li>
    );
  });

  return (
    <div>
      <h4 className="comments-title">💬 Comments ({comments.length})</h4>
      {comments.length > 0 ? (
        <ul className="comments-list">{renderedComments}</ul>
      ) : (
        <div className="no-comments">
          No comments yet. Be the first to comment!
        </div>
      )}
    </div>
  );
};

export default CommentList;
