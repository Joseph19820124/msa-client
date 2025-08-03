import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommentService } from '../../services/comment.service';
import { CreateCommentRequest } from '../../models/comment.model';

@Component({
  selector: 'app-comment-create',
  templateUrl: './comment-create.component.html',
  styleUrls: ['./comment-create.component.css']
})
export class CommentCreateComponent {
  @Input() postId!: string;
  @Output() commentAdded = new EventEmitter<void>();
  
  commentForm: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private commentService: CommentService
  ) {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  get content() {
    return this.commentForm.get('content');
  }

  onSubmit(): void {
    if (this.commentForm.valid && !this.loading) {
      const content = this.content?.value?.trim();
      if (!content) return;

      this.loading = true;
      this.error = null;

      const commentData: CreateCommentRequest = { content };

      this.commentService.createComment(this.postId, commentData).subscribe({
        next: () => {
          this.commentForm.reset();
          this.loading = false;
          this.commentAdded.emit();
        },
        error: (error) => {
          this.error = error.message || 'An error occurred';
          this.loading = false;
        }
      });
    }
  }

  get isSubmitDisabled(): boolean {
    return this.loading || !this.content?.value?.trim();
  }
}