import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CompanyService } from './company/company.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly companyService = inject(CompanyService);
  protected readonly companyName = this.companyService.displayName;

  ngOnInit(): void {
    this.companyService.refreshDisplayName();
  }
}
