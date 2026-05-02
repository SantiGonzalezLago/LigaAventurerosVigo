import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-splash-screen',
  templateUrl: 'splash-screen.component.html',
  styleUrls: ['splash-screen.component.scss'],
})
export class SplashScreenComponent implements OnInit {
  @Output() dismissed = new EventEmitter<void>();

  public fading = false;
  public readonly isTouchScreen = window.matchMedia('(pointer: coarse)').matches;
  private dismissed_ = false;

  ngOnInit(): void {
    setTimeout(() => this.dismiss(), 2000);
  }

  public dismiss(): void {
    if (this.dismissed_) return;
    this.dismissed_ = true;
    this.fading = true;
    setTimeout(() => this.dismissed.emit(), 400);
  }
}
