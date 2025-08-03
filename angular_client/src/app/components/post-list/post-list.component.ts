import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { PostService } from '../../services/post.service';
import { Post } from '../../models/post.model';

@Component({
  selector: 'app-post-list',
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.css']
})
export class PostListComponent implements OnInit, OnChanges {
  @Input() refreshTrigger = 0;
  
  posts: Post[] = [];
  loading = true;
  error: string | null = null;

  constructor(private postService: PostService) {}

  ngOnInit(): void {
    this.loadPosts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.loadPosts();
    }
  }

  loadPosts(): void {
    this.loading = true;
    this.error = null;

    this.postService.getPosts().subscribe({
      next: (postsObject) => {
        // Convert object to array like in React version
        this.posts = Object.values(postsObject || {});
        this.loading = false;
      },
      error: (error) => {
        this.error = error.message || 'An error occurred';
        this.loading = false;
      }
    });
  }

  onRefresh(): void {
    this.loadPosts();
  }

  onCommentAdded(): void {
    // Refresh posts when a comment is added
    this.loadPosts();
  }
}