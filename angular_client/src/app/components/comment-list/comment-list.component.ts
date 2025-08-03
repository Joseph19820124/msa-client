import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommentService } from '../../services/comment.service';
import { Comment } from '../../models/comment.model';

@Component({
  selector: 'app-comment-list',
  templateUrl: './comment-list.component.html',
  styleUrls: ['./comment-list.component.css']
})
export class CommentListComponent implements OnInit, OnChanges {
  @Input() postId!: string;
  
  comments: Comment[] = [];
  loading = true;
  error: string | null = null;

  constructor(private commentService: CommentService) {}

  ngOnInit(): void {
    this.loadComments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['postId'] && !changes['postId'].firstChange) {
      this.loadComments();
    }
  }

  loadComments(): void {
    if (!this.postId) return;
    
    this.loading = true;
    this.error = null;

    this.commentService.getComments(this.postId).subscribe({
      next: (comments) => {
        this.comments = comments || [];
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'An error occurred';
        this.loading = false;
      }
    });
  }
}