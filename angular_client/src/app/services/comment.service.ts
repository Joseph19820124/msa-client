import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfigService } from './config.service';
import { Comment, CreateCommentRequest } from '../models/comment.model';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  constructor(
    private http: HttpClient,
    private configService: ConfigService
  ) {}

  getComments(postId: string): Observable<Comment[]> {
    const url = `${this.configService.getCommentsUrl()}/posts/${postId}/comments`;
    return this.http.get<Comment[]>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  createComment(postId: string, commentData: CreateCommentRequest): Observable<Comment> {
    const url = `${this.configService.getCommentsUrl()}/posts/${postId}/comments`;
    return this.http.post<Comment>(url, commentData)
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