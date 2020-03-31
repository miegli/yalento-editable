import {Component, OnDestroy, OnInit} from '@angular/core';
import {BroadcastService} from '../../broadcast.service';
import {BehaviorSubject, Subject} from 'rxjs';
import {IEntity, takeUntil} from 'yalento';

@Component({
  selector: 'lib-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit, OnDestroy {

  destroy$: Subject<boolean> = new Subject<boolean>();
  entityHasChanges$: BehaviorSubject<IEntity<any>>;
  changesCount$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  isProcessing$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);


  private entitiesWithChanges: { [uuid: string]: IEntity<any> } = {};

  constructor(private broadcastService: BroadcastService) {

    this.entityHasChanges$ = broadcastService.entityHashChanges$;
  }

  ngOnInit() {
    this.entityHasChanges$.pipe(takeUntil(this.destroy$)).subscribe((entity) => {
      if (entity) {
        this.entitiesWithChanges[entity.getUuid()] = entity;
      }
      this.updateCount();
    })
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
  }

  save() {

    this.isProcessing$.next(true);
    setTimeout(() => {
      this.getEntities().forEach((entity) => {
        entity.save();
      });
      this.clearEntities();
      this.isProcessing$.next(false);
    }, 500);

  }

  discardAll() {

    this.isProcessing$.next(true);
    setTimeout(() => {
      this.getEntities().forEach((entity) => {
        entity.revert().then();
      });
      this.clearEntities();
      this.isProcessing$.next(false);
    }, 500);
  }

  private getEntities(): IEntity<any>[] {
    if (Object.keys(this.entitiesWithChanges).length === 0) {
      return [];
    }
    return Object.keys(this.entitiesWithChanges).map((key) => this.entitiesWithChanges[key]);
  }

  private clearEntities(): void {
    this.entitiesWithChanges = {};
    this.updateCount();
  }

  private updateCount() {
    this.changesCount$.next(Object.keys(this.entitiesWithChanges).length);
  }
}
