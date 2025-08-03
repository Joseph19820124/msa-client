import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { Post, CreatePostRequest } from '../models/post.model';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  getPosts(): Observable<{ [key: string]: Post }> {
    const url = `${this.configService.getPostsUrl()}/posts`;
    return this.http.get<{ [key: string]: Post }>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  createPost(postData: CreatePostRequest): Observable<Post> {
    const url = `${this.configService.getPostsUrl()}/posts`;
    return this.http.post<Post>(url, postData)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage = `Error: ${error.message}`;
    }
    
    console.error('API Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}