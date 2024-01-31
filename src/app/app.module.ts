import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BryntumSchedulerModule } from '@bryntum/scheduler-angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule  } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule} from '@angular/material/form-field';
import { MatDatepickerModule} from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import {provideNativeDateAdapter} from '@angular/material/core';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    BryntumSchedulerModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatIconModule,
    MatInputModule,

  ],
  providers: [provideNativeDateAdapter()],
  bootstrap: [AppComponent]
})
export class AppModule { }
