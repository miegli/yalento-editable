import {Injectable} from '@angular/core';
import {BehaviorSubject, fromEvent} from 'rxjs';
import {IEntity} from 'yalento';

export interface IEventSubscriber {
  click: { [uuid: string]: BehaviorSubject<{ target: Element, viewElement: Element }> },
  entityUpdated: { [uuid: string]: BehaviorSubject<IEntity<any>> },
}

@Injectable({
  providedIn: 'root'
})
export class BroadcastService {

  public entityHashChanges$: BehaviorSubject<IEntity<any>> = new BehaviorSubject(null);

  private hasEventListeners: { [event: string]: boolean } = {};

  private eventSubscribers: IEventSubscriber = {} as any;

  constructor() {

  }

  public getClickEventSubject(uuid: string): BehaviorSubject<{ target: Element, viewElement: Element }> {
    return this.on('click', uuid);
  }

  public unsubscribe(uuid: string): void {
    Object.keys(this.eventSubscribers).forEach((event) => {
      this.off(event as any, uuid);
    })
  }

  public dispatch(event: 'entityUpdated', uuid: string, value: any): void {

    if (this.eventSubscribers[event] === undefined) {
      this.eventSubscribers[event] = {};
    }

    if (this.eventSubscribers[event][uuid] === undefined) {
      this.eventSubscribers[event][uuid] = new BehaviorSubject<any>(null);
    }

    this.eventSubscribers[event][uuid].next(value);

  }

  public on(event: 'click' | 'entityUpdated', uuid: string): BehaviorSubject<any> {

    if (this.eventSubscribers[event] === undefined) {
      this.eventSubscribers[event] = {};
    }
    this.eventSubscribers[event][uuid] = new BehaviorSubject<any>(null);
    if (event === 'click') {
      this.addEventListener(event);
    }

    return this.eventSubscribers[event][uuid];
  }

  public off(event: 'click' | 'entityUpdated', uuid: string) {

    if (this.eventSubscribers[event] && this.eventSubscribers[event][uuid]) {
      this.eventSubscribers[event][uuid].complete();
      delete this.eventSubscribers[event][uuid];
    }

    if (!this.eventSubscribers[event] || Object.keys(this.eventSubscribers[event]).length === 0) {
      this.removeEventListener(event);
    }
  }

  private onClick(target: EventTarget) {

    const targetElement: HTMLElement = (target as HTMLElement).closest('[yalento-uuid]');

    if (targetElement && this.eventSubscribers && this.eventSubscribers.click && this.eventSubscribers.click[targetElement.getAttribute('yalento-uuid')]) {
      this.eventSubscribers.click[targetElement.getAttribute('yalento-uuid')].next({
        target: target as Element,
        viewElement: targetElement
      });
    }

  }

  private addEventListener(event: string) {
    if (!this.hasEventListeners[event]) {
      fromEvent(document, 'click').subscribe((e: MouseEvent) => {
        this.onClick(e.target);
      });
    }

    this.hasEventListeners[event] = true;

  }

  private removeEventListener(event: string) {
    this.hasEventListeners[event] = false;
  }


}
