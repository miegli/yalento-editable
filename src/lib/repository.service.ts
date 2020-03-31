import {Injectable} from '@angular/core';
import {BehaviorSubject, IEntity, Repository, takeWhile} from 'yalento';
import {DefaultEntity} from './models/defaultEntity';
import {AngularFirestore} from '@angular/fire/firestore';
import {BroadcastService} from './broadcast.service';

@Injectable({
  providedIn: 'root'
})
export class RepositoryService {

  private readonly repository: Repository<DefaultEntity>;

  private _cachedEntities: { [uuid: string]: IEntity<DefaultEntity> } = {};
  private _isLoadedFirst: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  constructor(private db: AngularFirestore, private broadcastService: BroadcastService) {
    this.repository = new Repository<DefaultEntity>(DefaultEntity, 'Default');
    this.repository.connectFirestore(this.db, {dataMode: 'ALL'});
    this.repository.select().getPaginator((event) => {
      event.getResults().forEach((entity) => {
        if (entity.isLoaded()) {
          this._cachedEntities[entity.getUuid()] = entity;
          this.broadcastService.dispatch('entityUpdated', entity.getUuid(), entity);
        }
      });
      if (!this._isLoadedFirst.getValue()) {
        this._isLoadedFirst.next(true);
      }
    });
  }

  async getOneByIdentifier(ngElementHash: string) {

    if (!this._isLoadedFirst.getValue()) {
      await this.waitForLoaded(ngElementHash), this._cachedEntities;
    }

    if (this._cachedEntities[ngElementHash] !== undefined) {
      this._cachedEntities[ngElementHash] = await this.repository.getOneByIdentifier(ngElementHash);
    }
    return this._cachedEntities[ngElementHash];
  }

  async createEntity(ngElementHash: string): Promise<IEntity<DefaultEntity>> {
    return this.repository.create({}, ngElementHash);
  }


  private waitForLoaded(ngElementHash: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this._isLoadedFirst.getValue()) {
        resolve(this._isLoadedFirst.getValue());
      } else {
        this._isLoadedFirst.pipe(takeWhile((value => !value))).toPromise().then(() => {
          resolve(this._isLoadedFirst.getValue());
        });
        this.repository.getOneByIdentifier(ngElementHash).then((result) => {
          if (result === undefined) {
            resolve(true);
          }
        })
      }
    })
  }
}
