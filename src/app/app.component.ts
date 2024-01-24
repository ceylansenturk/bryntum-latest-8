import { AfterViewInit, Component, ElementRef, HostBinding, Inject, Input, OnDestroy, OnInit, Optional, ViewChild, ViewEncapsulation } from '@angular/core';
import { BryntumSchedulerComponent } from '@bryntum/scheduler-angular';
import { schedulerConfig } from './app.config';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, fromEvent, merge, timer, Observable, Subscription, combineLatest, of, throwError, race } from 'rxjs';
import { loginToken } from '../main';
import { debounceTime, first, tap, filter, takeUntil, switchMap, catchError, map } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { AngSchedulerService } from './app.service';
import moment from 'moment';
import { SchedulerConfig } from '@bryntum/scheduler';

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
                debugger;
                this.schedulerConfig = {
                    ...schedulerConfig,
                    events: this.config$.getValue().events,
                    resources: this.config$.getValue().resources,
                    columns: this.config$.getValue().columns,
                    startDate: this.config$.getValue().startDate,
                    endDate: this.config$.getValue().endDate,
                    viewPreset: this.config$.getValue().viewPreset
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
                            duration: 16.5,
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
    }
}
