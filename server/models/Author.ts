import mongoose, { Document, Schema } from 'mongoose';

export interface IAuthor extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  bio: string;
  profilePic: string;
  earnings: number;
}

const AuthorSchema: Schema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  bio: {
    type: String,
    default: '',
  },
  profilePic: {
    type: String,
    default: '',
  },
  earnings: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

const Author = mongoose.model<IAuthor>('Author', AuthorSchema);
export default Author;
