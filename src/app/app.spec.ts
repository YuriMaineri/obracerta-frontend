import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './auth/auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('hides the top bar until someone logs in', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.topbar')).toBeNull();
  });

  it('shows the brand and the user in the top bar after login', async () => {
    TestBed.inject(AuthService).user.set({ id: 1, name: 'Carlos Maineri', email: 'carlos@maineri.com.br' });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('.brand')?.textContent).toContain('ObraCerta');
    expect(html.querySelector('.user')?.textContent).toContain('Carlos Maineri');
  });
});
