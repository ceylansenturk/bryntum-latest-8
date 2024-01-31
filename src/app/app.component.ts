import { AfterViewInit, Component, ElementRef, HostBinding, Inject, Input, OnDestroy, OnInit, Optional, ViewChild, ViewEncapsulation } from '@angular/core';
import { BryntumSchedulerComponent } from '@bryntum/scheduler-angular';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, fromEvent, merge, timer, Observable, Subscription, combineLatest, of, throwError, race } from 'rxjs';
import { loginToken } from '../main';
import { debounceTime, first, tap, filter, takeUntil, switchMap, catchError, map } from 'rxjs/operators';
import { FormControl, ReactiveFormsModule  } from '@angular/forms';
import { AngSchedulerService } from './app.service';
import moment from 'moment';
import { SchedulerConfig } from '@bryntum/scheduler';
import { testConfig } from './app.config';

declare var window: any;

interface UserData {
    USERID: number;
    ADI: string;
    PASIF: boolean;
}

interface Function {
    request?: Request;
    script: any;
}

interface Condition {
    Column?: any;
    Operator?: any;
    Value?: any;
    IsNull?: any;
}

interface Request {
    Object: string;
    Paging?: {};
    Select?: string[];
    Where?: Array<Condition>;
    OrderBy?: Array<{}>;
}

interface ConfigData {
    resources: any[];
    events: any[];
    timeRanges: {};
    rowHeight: number;
    barMargin: number;
    eventEdit: boolean | object;
    columns: object[]
    schedulerMode: string
    startDate: Date | null;
    endDate: Date | null;
    eventTooltip: any;
    eventContextMenu: boolean | object;
    eventStyle: string;
    minHeight: number;
    snapRelativeToEventStartDate: boolean;
    viewPreset: boolean | object;
    dayInterval: number;
    minuteOptions: number[];
    searchBoxPlaceholder: string;
    resourcesRequest: Request;
    eventsRequest: Request;
    getParams: Function;
    eventRenderer: Function;
    groupFullRenderer: Function;
    groupEmptyRenderer: Function;
    onSchedulerEvents: Function;
    toggleOverlay: Function;
    onAddOneDay: Function;
    onDecreaseOneDay: Function;
    getEvents: Function;
    changeTime: Function;
    changeStart: Function;
    newRes: Function;
    eventResize: Function;
    eventDragDrop: Function;
    getResources: Function;
    modeChange: Function;
    deleteEvent: Function;
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {

    @ViewChild('scheduler') schedulerComponent!: BryntumSchedulerComponent;

    scriptChanged$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

    events$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
    resources$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
    schedulerMode$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    startDate$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    endDate$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    timeIncrement$: BehaviorSubject<any> = new BehaviorSubject<any>(null);

    config$: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    schedulerConfig!: Partial<SchedulerConfig>

    get configObservable(): Observable<ConfigData> {
        return this.config$.asObservable();
    }

    _staffList: UserData[] = [];

    calendarMode = [
        {
            ID: 0, NAME: 'Horizontal'
        },
        {
            ID: 1, NAME: 'Vertical'
        },
    ]
    eventDrag: any = {
        listeners: {
            beforeEventDrag: () => {
            }
        }
    };
    renderingEvent: any;
    startDateParam: any;
    endDateParam: any;
    startHour: any;
    startMinute: any;
    endHour: any;
    endMinute: any;

    dropdownDate!: Date;
    displayScheduler: boolean = false;
    lastSearchString: string = '';
    schedulerMode: string = 'horizontal';

    totalEvents: number = 0

    lang!: string;
    langChange!: Subscription;
    searchBoxPlaceholder: string = '';

    loadingData = false;
    eventsResponse: any

    searchControl = new FormControl('');

    dayInterval: number = 1;
    minuteOptions: number[] = [];
    overlayVisible!: boolean;

    schedulerID!: string;
    script: any;

    @HostBinding('style') hoststyle = 'position: relative;';

    constructor(
        private http: HttpClient,
        public service: AngSchedulerService

    ) { }

    ngOnInit() {
        of(null).pipe(
            switchMap(() => this.service.getSchedulerConfig()),
            tap((config: any) => {
                this.script = config;
                this.schedulerMode = config.schedulerMode;
                this.dayInterval = config.dayInterval;
                this.searchBoxPlaceholder = config.searchBoxPlaceholder;
                this.minuteOptions = config.minuteOptions;

                this.config$.next(config);
            }),
            switchMap(() => this.service.getDepartmentSettings()),
            tap((settingsResp) => {
                this.processParams(settingsResp);
                this.updateConfigParams();
            }),
            switchMap(() => this.service.getResources()),
            tap((resp) => {
                this.processResources(resp);
                this.updateConfigResources();
            }),
            switchMap(() => this.service.getEvents()),
            tap((resp) => {
                this.processEvents(resp);
                this.updateConfigEvents();
            }),
            switchMap(() => {
                const currentConfig = this.config$.getValue()
                this.schedulerConfig = {
                    ...this.schedulerConfig,
                    events: currentConfig.events,
                    resources: currentConfig.resources,
                    columns: currentConfig.columns,
                    startDate: currentConfig.startDate,
                    endDate: currentConfig.endDate,
                    viewPreset: currentConfig.viewPreset,
                    features: {
                        timeRanges: currentConfig.timeRanges,
                        eventEdit: currentConfig.eventEdit,
                        eventTooltip: currentConfig.eventTooltip,
                        eventMenu: currentConfig.eventContextMenu
                    },
                    rowHeight: currentConfig.rowHeight,
                    barMargin: currentConfig.barMargin,
                    minHeight: currentConfig.minHeight,
                    eventStyle: currentConfig.eventStyle,
                    mode: currentConfig.schedulerMode,
                    snapRelativeToEventStartDate: currentConfig.snapRelativeToEventStartDate,
                    eventRenderer: currentConfig.eventRenderer
                }
                this.displayScheduler = true;
                return of(null)
            }),
            catchError(err => {
                //this.angDialog.error(err);
                return of(null)
            })
        ).subscribe();

        this.searchControl.valueChanges.pipe(
            debounceTime(1000),
            tap(searchString => {
                this.staffFilter(searchString)
            })
        ).subscribe();
    }

    translate(w: string) {
        //return this.translateService.dynamicTranslator.translate(w);
        return w;
    }

    processParams(settingsResp: any) {
        const resp = settingsResp.ResultSets?.[0]?.[0];
        const timeIncrement = (resp?.TAKVIM_DAKIKA_ARALIGI ?? 60);
        this.startDateParam = resp ? moment(resp.TAKVIM_BASLANGIC).format('HH:mm') : '08:00';
        this.endDateParam = resp ? moment(resp.TAKVIM_BITIS).format('HH:mm') : '18:00';
        const startTime = this.startDateParam;
        this.startHour = startTime.substring(0, 2);
        this.startMinute = startTime.substring(3, 5);
        const endTime = this.endDateParam;
        this.endHour = endTime.substring(0, 2);
        this.endMinute = endTime.substring(3, 5);

        const startDate = moment().set({ hour: this.startHour, minute: this.startMinute, second: 0 }).toDate();
        const endDate = moment().set({ hour: this.endHour, minute: this.endMinute, second: 0 }).toDate();
        console.log('startDate', startDate)
        console.log('endDate', endDate)

        this.startDate$.next(startDate);
        this.endDate$.next(endDate);
        this.timeIncrement$.next(timeIncrement);
        this.displayScheduler = true;
    }

    updateConfigParams() {
        this.startDate$.subscribe(() => {
            const currentConfig = this.config$.getValue();
            const startDate = this.startDate$.getValue();
            this.config$.next({
                ...currentConfig,
                startDate: startDate,
            });
            this.dropdownDate = startDate
        });
        this.endDate$.subscribe(() => {
            const currentConfig = this.config$.getValue();
            const endDate = this.endDate$.getValue();

            let newWhereConditions = currentConfig.getEvents.request.Where
                ? currentConfig.getEvents.request.Where.filter((condition: any) => condition.Column !== 'ACTIONSTART')
                : [];

            newWhereConditions.push(
                { Column: 'ACTIONSTART', Operator: '>=', Value: moment(this.startDate$.getValue()).format('YYYY-MM-DD') },
                { Column: 'ACTIONSTART', Operator: '<=', Value: moment(endDate).format('YYYY-MM-DD') }
            );

            this.config$.next({
                ...currentConfig,
                endDate: endDate,
                getEvents: {
                    ...currentConfig.getEvents,
                    request: {
                        ...currentConfig.getEvents.request,
                        Where: newWhereConditions
                    }
                }
            });
        });
        this.timeIncrement$.subscribe(() => {
            const timeIncrement = this.timeIncrement$.getValue();
            this.config$.next({
                ...this.config$.getValue(),
                viewPreset: {
                    tickWidth: 120,
                    displayDateFormat: 'DD.MM.YYYY hh:MM',
                    shiftIncrement: 1,
                    shiftUnit: 'minute',
                    defaultSpan: 1,
                    timeResolution: {
                        unit: 'minute',
                        increment: 10
                    },

                    headers: [
                        {
                            unit: 'day',
                            dateFormat: 'DD MMMM'
                        },
                        {
                            unit: 'minute',
                            dateFormat: 'HH:mm',
                            increment: timeIncrement
                        }
                    ],

                    columnLinesFor: 'center'
                }
            })
        })
    }

    async processResources(resp: any) {
        this._staffList = resp?.ResultSets?.[0].filter((r: any) => r.ADI != null);

        if (this.lastSearchString.length > 0) {
            this.staffFilter(this.lastSearchString);
        } else {
            this.resources$.next(
                this._staffList.map((r) => {
                    return {
                        id: r.USERID,
                        name: r.ADI,
                    };
                })
            );
        }
    }

    updateConfigResources() {
        this.resources$.subscribe(() => {
            const resources = this.resources$.getValue();
            this.config$.next({
                ...this.config$.getValue(),
                resources: resources
            });
        });
    }

    staffFilter(searchString: any) {
        searchString = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        this.lastSearchString = searchString;
        const _filter: UserData[] = [];
        this._staffList.map(data => {
            const _name = data?.ADI?.toLowerCase();
            if (_name !== undefined && _name.includes(searchString.toLowerCase())) {
                _filter.push(data);
            }
        });
        if (_filter?.length) {
            this.resources$.next(
                _filter.map(r => {
                    return {
                        'id': r.USERID,
                        'name': r.ADI,
                    }
                })
            );
        } else {
            this.resources$.next(
                this._staffList.map(r => {
                    return {
                        'id': r.USERID,
                        'name': r.ADI,
                    }
                })
            );
        }
        //this.refreshCalendar(false)
    }

    processEvents(resp: any) {
        if (this.loadingData === false) {
            this.loadingData = true;
            this.totalEvents = resp?.ResultSets?.[0]?.length ?? 0;
            if (resp?.ResultSets?.[0]?.length) {
                const _data = resp.ResultSets[0];
                this.events$.next(
                    _data.map((r: any) => {
                        return {
                            startDate: moment(r.ACTIONSTART).toDate(),
                            endDate: moment(r.ACTIONEND).toDate(),
                            durationUnit: 'H',
                            cls: '',
                            draggable: true,
                            resizable: true,
                            id: r.ID,
                            resourceId: r.USERID || -1,
                            name: (r.HADI || '') + ' ' + (r.HSOYADI || ''),
                            eventColor:
                                r.ACTIONTYPEID == null || r.ACTIONTYPEID == 1
                                    ? 'pink'
                                    : r.ACTIONTYPEID == 2
                                        ? 'green'
                                        : r.ACTIONTYPEID == 3
                                            ? 'yellow'
                                            : 'gray',

                            userId: r.USERID,
                            comment: r.DESCRIPTION || '',
                            phone: r.PHONE,
                            email: r.EMAIL,
                            islemTypeId: r.ISLEMTYPEID,
                            yontemId: r.YONTEMID,
                            actionTypeId: r.ACTIONTYPEID,
                            crId: r.CRID,
                            yontemadı: r.YONTEMADI,
                            islemadı: r.ISLEMADI,
                            subeid: r.SUBEID,
                        };
                    })
                );
            }
            this.loadingData = false;
        }
        this.displayScheduler = false;
        setTimeout(() => {
            this.displayScheduler = true;
        }, 0);
    }

    updateConfigEvents() {
        this.events$.subscribe(() => {
            const events = this.events$.getValue();
            this.config$.next({
                ...this.config$.getValue(),
                events: events
            });
        });
        if (this.config$.getValue().eventContextMenu.script) {
            try {
                const fn = new Function('return ' + this.config$.getValue().eventContextMenu.script)
                const contextMenu = fn();
                this.config$.next({
                    ...this.config$.getValue(),
                    eventContextMenu: contextMenu
                })
            } catch (e) {
                //this.angusDialog.alert(e);
            }
        }
        if (this.config$.getValue().eventTooltip.script) {
            try { //BURASI SORUNLU, DÜZELTİLECEK
                const fn = (new Function('return ' + this.config$.getValue().eventTooltip.script).bind(this))
                const tooltip = fn();
                this.config$.next({
                    ...this.config$.getValue(),
                    eventTooltip: tooltip
                })
            } catch (e) {
                //this.angusDialog.alert(e);
            }
        }
    }

    eventRenderer({ eventRecord }: any) {
        try {
            const fn = (new Function('eventRecord', this.config$.getValue().eventRenderer.script));
            return fn(eventRecord);
        } catch (e) {
            //this.angusDialog.alert(e);
        }
    }

    groupFullRenderer({ events, eventStore, resourceStore, startDate$, endDate$ }: { events: any, eventStore: any, resourceStore: any, startDate$: any, endDate$: any }) {
        return events.filter((event: any) => moment(event.endDate).isAfter(moment(endDate$))).length;
    }

    groupEmptyRenderer({ events, eventStore, resourceStore, startDate$, endDate$ }: { events: any, eventStore: any, resourceStore: any, startDate$: any, endDate$: any }) {
        const groupKey = resourceStore.groupInfo.field;
        const groupValue = this.renderingEvent ? this.renderingEvent.resource[resourceStore.groupInfo.field] : undefined;
        window.rs = resourceStore;
        if (groupValue) {
            const fullEvents = events.filter((event: any) => moment(event.endDate).isAfter(moment(endDate$))).length;
            return resourceStore.getGroupRecords(groupValue).length - fullEvents;
        } else {
            return '';
        }
    }

    onSchedulerEvents(event: any) {
        if (this.config$.getValue().onSchedulerEvents?.script) {
            try {
                const fn = (new Function('event', this.config$.getValue().onSchedulerEvents.script).bind(this));
                return fn(event)
            } catch (e) {
                //this.angusDialog.alert(e);
            }
        } else {
            if (event.type === 'beforedragcreatefinalize') {
                this.newRes(event);
            } else if (event.type === 'beforeeventresizefinalize') {
                this.eventResize(event);
            } else if (event.type === 'beforeeventdropfinalize') {
                event.context.async = true;
                setTimeout(() => {
                    this.eventDragDrop(event).then(() => {
                        event.context.finalize(true);
                    });
                }, 0);
            } else if (event.type === 'eventcontextmenuitem') {
                if (event.item.initialConfig.text === 'Talep Kaydını Aç') {
                    /*const dialogRef = this.dialog.open(RecordDialogComponent, {
                      data: {
                        recordID: 'med-crm-2',
                        index: event.eventRecord.data.crId,
                      },
                    });
                    dialogRef.afterClosed().subscribe(() => {
                      setTimeout(() => {
                        this.refreshCalendar(true);
                      }, 250);
                    });*/
                }
                if (event.item.initialConfig.text === 'İş Detayını Aç') {
                    /*this.popupForm
                      .openRecord('crm-new-lead-edit', null, {
                        ACTIONID: event.eventRecord.id,
                        CRID: event.eventRecord.crId,
                        YONTEMID: event.eventRecord.yontemId,
                        PHONE: event.eventRecord.phone,
                        MAIL: event.eventRecord.email,
                        PATIENTFULLNAME: event.eventRecord.name,
                        ISLEMADI: event.eventRecord.islemadı,
                        YONTEMADI: event.eventRecord.yontemadı,
                        DESCRIPTIONESKI: event.eventRecord.comment,
                      })
                      .subscribe(() => {
                        setTimeout(() => {
                          this.refreshCalendar(true);
                        }, 250);
                      });*/
                }
                if (event.item.initialConfig.text === 'İş Kaydını Sil') {
                    //this.deleteEvent(event.eventRecord.data.id);
                }
            } else if (event.type === 'eventdblclick') {
                /*this.popupForm
                  .openRecord('crm-new-lead-edit', null, {
                    ACTIONID: event.eventRecord.id,
                    CRID: event.eventRecord.crId,
                    YONTEMID: event.eventRecord.yontemId,
                    PHONE: event.eventRecord.phone,
                    MAIL: event.eventRecord.email,
                    PATIENTFULLNAME: event.eventRecord.name,
                    ISLEMADI: event.eventRecord.islemadı,
                    YONTEMADI: event.eventRecord.yontemadı,
                    DESCRIPTIONESKI: event.eventRecord.comment,
                  })
                  .subscribe(() => {
                    setTimeout(() => {
                      this.refreshCalendar(true);
                    }, 250);
                  });*/
                return false;
            } else if (event.type === 'eventmouseenter') {
                var floatingRoots = document.getElementsByClassName('b-float-root');
                var floatingRoot = floatingRoots.length > 0 ? floatingRoots[0] : null;
                if (floatingRoot != null) {
                    var tooltips = floatingRoot.getElementsByClassName('b-sch-event-tooltip') as any;
                    for (var i = 0; i < tooltips.length; i++)
                        tooltips[i]['style']['display'] = 'none';
                    setTimeout(() => {
                        var tooltips = floatingRoot!.getElementsByClassName('b-sch-event-tooltip') as any;
                        for (var i = 0; i < tooltips.length; i++)
                            tooltips[i]['style']['display'] = '';
                    }, 1000);
                }
            } else if (event.type === 'headercontextmenushow') {
                const floatingDivRoots = document.getElementsByClassName('b-float-root');
                if (floatingDivRoots.length > 0) {
                    var floatingDivRoot = floatingDivRoots[0];
                    floatingDivRoot.innerHTML = '';
                }
            } else if (
                ['beforepresetchange', 'beforezoomchange'].includes(event.type) ||
                event.type === 'schedulecontextmenubeforeshow'
            ) {
                return false;
            }
        }
    }

    async newRes(event: any) {
        /*if (this.config$.getValue().newRes?.script) {
          try {
            const fn = (new Function('event', this.config$.getValue().newRes.script).bind(this));
            fn(event)
          } catch (e) {
            this.angusDialog.alert(e);
          }
        } else {
          let confirmResp = ''
          if (event.context.startDate.getTime() <= Date.now()) {
            confirmResp = await this.angusDialog.confirm('Geçmiş tarihte kayıt açmayı onaylıyor musunuz?').toPromise();
          }
          if (confirmResp || event.context.startDate.getTime() >= Date.now()) {
            this.popupForm.openRecord(
              'crm-new-lead-add',
              null,
              {
                ACTIONSTART: moment(event.context.startDate).format('YYYY-MM-DD HH:mm:ss'),
                ACTIONEND: moment(event.context.endDate).format('YYYY-MM-DD HH:mm:ss'),
                USERID: event.context.resourceRecord.id,
                USERID_ADI: event.context.resourceRecord.name,
                ISLEMTYPEID: event.context.islemTypeId,
                YONTEMID: event.context.yontemId,
                ACTIONTYPEID: event.context.actionTypeId,
                CRID: event.context.crId,
                SUBEID: event.context.subeid
              }
            ).subscribe(async () => {
              setTimeout(async () => {
                this.refreshCalendar(true);
              }, 250);
            });
          } else {
            this.refreshCalendar(false);
          }
        }*/
    }

    async eventResize(event: any) {
        /*if (this.config$.getValue().eventResize?.script) {
          try {
            const fn = (new Function('event', this.config$.getValue().eventResize.script).bind(this));
            fn(event)
          } catch (e) {
            this.angusDialog.alert(e);
          }
        } else {
          let confirmResp = false;
          if (event.context.eventRecord.data.startDate.getTime() <= Date.now()) {
            confirmResp = await this.angusDialog.confirm('Geçmiş tarihte işlem yapmayı onaylıyor musunuz?').toPromise();
          } else {
            confirmResp = await this.angusDialog.confirm('Değiştirme İşlemini Onaylıyor Musunuz?').toPromise();
          }
          if (confirmResp === true) {
            const updateResp = await this.service.eventResizeUpdate(
              event.context.eventRecord.data.id,
              moment(event.context.eventRecord.data.startDate).format('YYYY-MM-DD HH:mm'),
              moment(event.context.eventRecord.data.endDate).format('YYYY-MM-DD HH:mm'),
              event.context.eventRecord.userId
            )
          } else {
            this.refreshCalendar(false);
            return false;
          }
    
          this.refreshCalendar(true);
        }*/
    }

    async eventDragDrop(event: any) {
        /*if (this.config$.getValue().eventDragDrop?.script) {
          try {
            const fn = (new Function('event', this.config$.getValue().eventDragDrop.script).bind(this));
            return fn(event);
          } catch (e) {
            this.angusDialog.alert(e);
          }
        } else {
          let confirmResp = false;
          if (event.context.startDate.getTime() <= Date.now()) {
            confirmResp = await this.angusDialog.confirm('Geçmiş tarihte işlem yapmayı onaylıyor musunuz?').toPromise();
          } else {
            confirmResp = await this.angusDialog.confirm('Değiştirme işlemini onaylıyor musunuz?').toPromise();
          }
          if (confirmResp === true) {
            const updateResp = await this.service.eventResizeUpdate(
              event.context.record.id,
              moment(event.context.startDate).format('YYYY-MM-DD HH:mm'),
              moment(event.context.endDate).format('YYYY-MM-DD HH:mm'),
              event.context.newResource.id
            );
          } else {
            this.refreshCalendar(false);
            return false;
          }
          this.refreshCalendar(true);
        }*/
    }

    modeChange(mode: any) {
        if (this.config$.getValue().modeChange?.script) {
            try {
                const fn = (new Function('mode', this.config$.getValue().modeChange.script).bind(this));
                return fn(mode)
            } catch (e) {
                // this.angusDialog.alert(e);
            }
        } else {
            this.schedulerMode$.next(mode);
            //this.updateConfigMode();
            //this.refreshCalendar(false);
        }

    }


    changeTime(newValue: any) {
        if (this.config$.getValue().changeTime?.script) {
            try {
                const fn = (new Function('newValue', this.config$.getValue().changeTime.script).bind(this));
                fn(newValue)
            } catch (e) {
                // this.angusDialog.alert(e);
            }
        } else {
            this.config$.next({
                ...this.config$.getValue(),
                viewPreset: {
                    tickWidth: 120,
                    displayDateFormat: 'DD.MM.YYYY hh:MM',
                    shiftIncrement: 1,
                    shiftUnit: 'minute',
                    defaultSpan: 1,
                    timeResolution: {
                        unit: 'minute',
                        increment: 1
                    },

                    headerConfig: {
                        middle: {
                            unit: 'minute',
                            dateFormat: 'HH:mm',
                            increment: newValue
                        },
                        top: {
                            unit: 'day',
                            dateFormat: 'DD MMMM'
                        }
                    },

                    linesFor: 'center'
                }
            })
            //this.refreshCalendar(false);
        }
    }


    onDecreaseOneDay() {
        if (this.config$.getValue().onDecreaseOneDay?.script) {
          try {
            (new Function(this.config$.getValue().onDecreaseOneDay.script).bind(this))();
          } catch (e) {
           // this.angusDialog.alert(e);
          }
        } else {
          setTimeout(() => {
            const startDate = moment(this.config$.getValue().startDate).add(-this.dayInterval, 'd').toDate();
            this.startDate$.next(startDate)
            setTimeout(() => {
              const endDate = moment(this.config$.getValue().endDate).add(-this.dayInterval, 'd').toDate();
              this.endDate$.next(endDate)
              setTimeout(() => {
               // this.refreshCalendar(true);
              }, 0);
            }, 0);
          }, 0);
        }
      }


      onAddOneDay() {
        if (this.config$.getValue().onAddOneDay?.script) {
          try {
            (new Function(this.config$.getValue().onAddOneDay.script).bind(this))();
          } catch (e) {
          //  this.angusDialog.alert(e);
          }
        } else {
          setTimeout(() => {
            const startDate = moment(this.config$.getValue().startDate).add(+this.dayInterval, 'd').toDate();
            this.startDate$.next(startDate)
            setTimeout(() => {
              const endDate = moment(this.config$.getValue().endDate).add(+this.dayInterval, 'd').toDate();
              this.endDate$.next(endDate)
              setTimeout(() => {
               // this.refreshCalendar(true);
              }, 0);
            }, 0);
          }, 0);
        }
      }


      async changeStart(newStart:any) {
        /*
        if (this.config$.getValue().changeStart?.script) {
          try {
            const fn = (new Function('newStart', this.config$.getValue().changeStart.script).bind(this));
            fn(newStart)
          } catch (e) {
           // this.angusDialog.alert(e);
          }
        } else {
          if (this.loadingData === false) {
            const newDate = moment(newStart).toDate();
            const startDate = moment(newDate).set({ hour: this.startHour, minute: 0, second: 0 }).toDate();
            this.startDate$.next(startDate)
            const endDate = moment(newDate).set({ hour: this.endHour, minute: 0, second: 0 }).toDate();
            this.endDate$.next(endDate)
          //  this.refreshCalendar(true);
            this.loadingData = false;
          }
        }*/
      }


      openConfigDialog() {/*
        const dialogRef = this.matDialog.open(CodeEditorDialogComponent, {
          minWidth: '80vw',
          minHeight: '80vh',
          data: {
            content: this.script || '',
            language: 'json'
          }
        });
    
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.script = result;
            this.saveConfig();
          }
        });*/
      }


      async saveConfig(): Promise<void> {/*
        const loading = this.loadingService.showLoadingOverlay();
        try {
          await this.apiService.setConfig(`scheduler.${this.schedulerID}.config`, this.script);
          this.scriptChanged$.next({ id: this.schedulerID });
        } finally {
          loading.destroy();
        }*/
      }

}
