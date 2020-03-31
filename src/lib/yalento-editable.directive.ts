import {
  ApplicationRef,
  ComponentFactoryResolver,
  Directive, EmbeddedViewRef, Injector, Input, OnChanges,
  OnDestroy,
  OnInit,
  Renderer2, SimpleChanges, TemplateRef,
  ViewContainerRef,
  ViewRef
} from '@angular/core';
import {ActivatedRoute, ActivatedRouteSnapshot} from '@angular/router';
import {sha1} from './helpers/sha1';
import {NgForOf, NgForOfContext, NgIf} from '@angular/common';
import {BroadcastService} from './broadcast.service';
import {IEntity, Repository, Subject, takeUntil} from 'yalento';
import {DefaultEntity} from './models/defaultEntity';
import {RepositoryService} from './repository.service';
import {ToolbarComponent} from './components/toolbar/toolbar.component';
import {Template} from '@angular/compiler/src/render3/r3_ast';
import set = Reflect.set;

@Directive({
  selector: '[yalentoEditable]'
})
export class YalentoEditableDirective implements OnInit, OnDestroy {
  private uuid: string = Repository.generateUuid();
  private ngElementHash: string;
  private ngElementSelector: string;
  private ngElementInputs: { [key: string]: any };
  private ngElementActivatedRouteSnapshot: ActivatedRouteSnapshot;
  private editableElementsMap: { [hash: string]: { selector: string; position: number, ngElementHash: string } } = {};
  private _entity: IEntity<DefaultEntity>;
  private _ngForOfContext: NgForOfContext<any> = {index: -1} as any;
  private _ngForOfContextView: NgForOfContext<any> = {index: -1} as any;
  private destroy$: Subject<boolean> = new Subject();
  private htmlElementOfDirective: HTMLElement;

  @Input() set yalentoEditable(options: any) {

  }

  constructor(
    private templateRef: TemplateRef<any>,
    private repositoryService: RepositoryService,
    private componentFactoryResolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private injector: Injector,
    private viewContainerRef: ViewContainerRef, private viewRef: ViewRef, private activatedRoute: ActivatedRoute, private renderer: Renderer2, private broadcastService: BroadcastService) {
    this.detectNgForOfContext();
  }

  detectNgForOfContext() {
    const hostView = this.viewContainerRef['_hostView'];
    hostView.forEach((view) => {
        if (view && view instanceof NgForOfContext) {
          this._ngForOfContext = view;
        }
      }
    )
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.broadcastService.unsubscribe(this.uuid);
  }

  ngOnInit(): void {
    this.detectNgElement().then();
    this.broadcastService.getClickEventSubject(this.uuid).subscribe((element) => {
      if (element) {
        this.onClick(element.target, element.viewElement);
      }
    });
  }

  private addToolbarComponent() {

    const body = document.getElementsByTagName('body')[0];

    if (body.classList.contains('has-yalento-toolbar') === false) {
      this.renderer.addClass(body, 'has-yalento-toolbar');
      const componentRef = this.componentFactoryResolver.resolveComponentFactory(ToolbarComponent).create(this.injector);
      this.appRef.attachView(componentRef.hostView);
      const child = (componentRef.hostView as EmbeddedViewRef<any>)
        .rootNodes[0] as HTMLElement;
      this.renderer.appendChild(body, child.firstChild);
    }
  }

  private applyDataFromEntity() {
    const viewRef = this.templateRef.createEmbeddedView({});
    this.viewContainerRef.clear();
    this.htmlElementOfDirective = viewRef.rootNodes[0];
    this.renderer.setAttribute(this.htmlElementOfDirective, 'yalento-element-id', this.ngElementHash);
    this.renderer.setAttribute(this.htmlElementOfDirective, 'yalento-uuid', this.uuid);
    this.renderer.setAttribute(this.viewRef['_lView'][0], 'yalento-view', this.uuid);
    this.loadData(this._entity);
    viewRef.detectChanges();
    viewRef.checkNoChanges();
    viewRef.markForCheck();
    this.viewContainerRef.insert(viewRef);
  }

  private async detectNgElement() {


    this.ngElementActivatedRouteSnapshot = this.activatedRoute.snapshot;

    if (this.viewRef['context'].constructor['ɵcmp']) {
      this.ngElementSelector = this.viewRef['context'].constructor['ɵcmp']['selectors'].join();
      this.ngElementInputs = this.viewRef['context'].constructor['ɵcmp'].inputs;
    }

    this.viewContainerRef['_hostView'].forEach((view) => {
      if (view instanceof NgForOfContext) {
        this._ngForOfContextView = view;
      }
    });


    this.ngElementHash = sha1(JSON.stringify(
      [
        this.ngElementSelector,
        this.ngElementInputs,
        this.ngElementActivatedRouteSnapshot.params,
        this.ngElementActivatedRouteSnapshot.url.join('<'),
        this._ngForOfContext.index,
        this._ngForOfContextView.index
      ]
    ));

    this._entity = await this.repositoryService.getOneByIdentifier(this.ngElementHash);

    if (this._entity !== undefined) {
      this.applyDataFromEntity();
    } else {
      const viewRef = this.viewContainerRef.createEmbeddedView(this.templateRef);
      this.htmlElementOfDirective = viewRef.rootNodes[0];
      this.renderer.setAttribute(this.htmlElementOfDirective, 'yalento-element-id', this.ngElementHash);
      this.renderer.setAttribute(this.htmlElementOfDirective, 'yalento-uuid', this.uuid);
      this.renderer.setAttribute(this.viewRef['_lView'][0], 'yalento-view', this.uuid);
    }

    this.broadcastService.off('entityUpdated', this.ngElementHash);

    this.broadcastService.on('entityUpdated', this.ngElementHash).pipe(takeUntil(this.destroy$)).subscribe((entity) => {
      if (entity) {
        this._entity = entity;
        this.loadData(this._entity);
      }
    });

    this.addToolbarComponent();


  }

  private calculateElementHash(element: Element, viewElement: Element): string {

    const identifier = this.getDomTreeIdentifier(element, viewElement);
    const hash = sha1(JSON.stringify({...identifier, ngElementHash: this.ngElementHash})).toString();
    this.editableElementsMap[hash] = {
      position: identifier.position,
      selector: identifier.selector,
      ngElementHash: this.ngElementHash
    };
    return hash;
  }

  private getDomTreeIdentifier(element: Element, viewElement: Element): { selector: string, position: number } {

    const tempId = Repository.generateUuid();
    this.renderer.setAttribute(element, 'yalento-temp-id', tempId);

    let tree = [];

    const getParent = (childElement: Element): void => {

      if (childElement.hasAttribute('yalento-view')) {
        return;
      }

      tree.push(childElement.tagName);

      if (childElement.parentElement) {
        getParent(childElement.parentElement);
      }


    }

    getParent(element);

    tree = tree.reverse().slice(1);
    let id = tree.join('>').toLowerCase();

    let position = -1;
    const siblings = viewElement.querySelectorAll(id);
    for (let i = 0; i < siblings.length; i++) {
      if (position < 0 && siblings.item(i).getAttribute('yalento-temp-id') === tempId) {
        position = i;
      }
    }

    return {selector: id, position: position};

  }

  private async openEditor(element: Element, viewElement: Element) {

    if (element.querySelectorAll(':not(br)').length > 1) {
      return;
    }

    if (element.getAttribute('contenteditable')) {
      return;
    }

    element.addEventListener('click', (e) => {
      e.preventDefault();
    })

    const hash = this.calculateElementHash(element, viewElement);
    this.renderer.setAttribute(element, 'contenteditable', 'true');
    this.renderer.setAttribute(element, 'yalento-element-hash', hash);
    this.renderer.removeAttribute(element, 'yalento-temp-id');


    setTimeout(() => {
      (element as any).focus();
    }, 10);


    if (this._entity === undefined) {
      this._entity = await this.repositoryService.createEntity(this.ngElementHash);
    }


    element.addEventListener('input', (event) => {
      this._entity[hash] = {...this.editableElementsMap[hash], content: (event.target as any).innerHTML};
      this.broadcastService.entityHashChanges$.next(this._entity);
    });

  }

  private onClick(element: Element, viewElement: Element) {
    this.openEditor(element, viewElement).then();
  }

  private appendData(data: { selector: string, position: number, content: string }): boolean {

    if (!this.htmlElementOfDirective.tagName) {
      return false;
    }
    const target = this.htmlElementOfDirective.querySelectorAll(data.selector);

    if (target.item(data.position)) {
      target.item(data.position).innerHTML = data.content;
      return true;
    }

    return false;

  }

  private loadData(entity: IEntity<DefaultEntity>) {
    if (!entity) {
      return;
    }

    const entityKeysNotAppended = {};

    const append = () => {

      Object.keys(entity).forEach((key) => {
        if (key.substr(0, 1) !== '_') {
          if (this.appendData(entity[key]) === false) {
            entityKeysNotAppended[key] = true;
          } else {
            if (entityKeysNotAppended[key] !== undefined) {
              delete entityKeysNotAppended[key];
            }
          }
        }

      })
    };

    append();

  }


}
