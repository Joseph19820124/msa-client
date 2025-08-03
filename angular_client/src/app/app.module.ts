import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { PostCreateComponent } from './components/post-create/post-create.component';
import { PostListComponent } from './components/post-list/post-list.component';
import { CommentCreateComponent } from './components/comment-create/comment-create.component';
import { CommentListComponent } from './components/comment-list/comment-list.component';

import { PostService } from './services/post.service';
import { CommentService } from './services/comment.service';
import { ConfigService } from './services/config.service';

@NgModule({
  declarations: [
    AppComponent,
    PostCreateComponent,
    PostListComponent,
    CommentCreateComponent,
    CommentListComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [
    PostService,
    CommentService,
    ConfigService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }