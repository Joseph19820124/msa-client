import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = '📝 BlogSpace';
  refreshTrigger = 0;

  onPostCreated(): void {
    this.refreshTrigger++;
  }
}