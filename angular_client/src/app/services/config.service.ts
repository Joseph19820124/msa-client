import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  constructor() {}

  getPostsUrl(): string {
    return environment.postsServiceUrl;
  }

  getCommentsUrl(): string {
    return environment.commentsServiceUrl;
  }
}