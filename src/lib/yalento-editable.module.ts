import {NgModule} from '@angular/core';
import {
  AngularFireModule,
  FIREBASE_APP_NAME,
  FIREBASE_OPTIONS,
  FirebaseAppConfig,
  FirebaseOptions
} from '@angular/fire';
import {AngularFirestore} from '@angular/fire/firestore';
import {CommonModule} from '@angular/common';
import {YalentoEditableDirective} from './yalento-editable.directive';
import { ToolbarComponent } from './components/toolbar/toolbar.component';

import 'firebase/firestore';

@NgModule({
  declarations: [YalentoEditableDirective, ToolbarComponent],
  imports: [
    AngularFireModule,
    CommonModule
  ],
  providers: [AngularFirestore],
  exports: [YalentoEditableDirective]
})
export class YalentoEditableModule {

  static initializeApp(options: FirebaseOptions, nameOrConfig?: string | FirebaseAppConfig) {
    return {
      ngModule: YalentoEditableModule,
      providers: [
        {provide: FIREBASE_OPTIONS, useValue: options},
        {provide: FIREBASE_APP_NAME, useValue: nameOrConfig}
      ],
    }
  }

}
