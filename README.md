# YalentoEditable

Yalento editable is a new approach to a "zero configuration semantic content edit system" and only consists of an intelligent Angular Directive.

Insert the `*yalentoEditable` directive into any Angular component and you can edit and save all content within the element via wysiwyg. You don't need any placeholders or other adjustments to your template. The directive automatically recognizes the position of the adjusted content and can load it again at the right place at any time - and all that with realtime support thanks to google firebase.

Installation:
- Create an firebase project
- Create an angular 9+ project
- Add the npm library `ng add yalento-editable`

Now import the YalentoEditableModule by initializing it with your firebase credentials:
 
```angular2
@NgModule({  
 imports: [
    YalentoEditableModule.initializeApp({ 
        apiKey: "**,
        authDomain: "**.firebaseapp.com", 
        databaseURL: "https://**.firebaseio.com", 
        projectId: "**", 
        storageBucket: "**.appspot.com", 
        messagingSenderId: "**", 
        appId: "**", 
        measurementId: "**"
        })
    ]})
```
Finally, insert the directive anywhere on your Angular component templates.
```html
<section class="pricing py-5" *ngFor="let item of [1,2]">
  <div class="container" *yalentoEditable>
    <div class="row">
```

Now you can edit any HTML element within your components. You don't have to worry about saving / loading. It is a zero configuration approach. Have fun!

Notes:
- This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 9.0.7.
- This library shows the strength of angular structural directives. 
- Please use this library only for demonstration purposes or at your own risk.
