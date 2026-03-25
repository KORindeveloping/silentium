import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  bookId: mongoose.Schema.Types.ObjectId;
  userId: mongoose.Schema.Types.ObjectId;
  content: string;
  parentId?: mongoose.Schema.Types.ObjectId;
  likes: mongoose.Schema.Types.ObjectId[];
}

const CommentSchema: Schema = new Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
}, {
  timestamps: true,
});

const Comment = mongoose.model<IComment>('Comment', CommentSchema);
export default Comment;
