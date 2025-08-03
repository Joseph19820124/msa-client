import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PostService } from '../../services/post.service';
import { CreatePostRequest } from '../../models/post.model';

@Component({
  selector: 'app-post-create',
  templateUrl: './post-create.component.html',
  styleUrls: ['./post-create.component.css']
})
export class PostCreateComponent {
  @Output() postCreated = new EventEmitter<void>();
  
  postForm: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private postService: PostService
  ) {
    this.postForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  get title() {
    return this.postForm.get('title');
  }

  onSubmit(): void {
    if (this.postForm.valid && !this.loading) {
      const title = this.title?.value?.trim();
      if (!title) return;

      this.loading = true;
      this.error = null;

      const postData: CreatePostRequest = { title };

      this.postService.createPost(postData).subscribe({
        next: () => {
          this.postForm.reset();
          this.loading = false;
          this.postCreated.emit();
        },
        error: (error) => {
          this.error = error.message || 'An error occurred';
          this.loading = false;
        }
      });
    }
  }

  get isSubmitDisabled(): boolean {
    return this.loading || !this.title?.value?.trim();
  }
}