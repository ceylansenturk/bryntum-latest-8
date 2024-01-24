import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { loginToken } from '../main';
import { firstValueFrom } from 'rxjs';
//import { ApiService, ApiWhereObject } from 'projects/angus/src/lib/services/api.service';
//import { AngusDialog } from 'projects/angus/src/lib/shared-components/angus-dialog/angus-dialog';

export interface Res {
    ID: number;
    CRID: number;
    SUBEID: number;
    ACTIONSTART: string;
    ACTIONEND: string;
    USERID: number;
    ACTIONTYPEID: number;
    DESCRIPTION: string;
    COMPLETED: boolean;
    CREATORID: number;
    REQUESTDATE: string;
    NOTES: string;
    CHECKOUT: string;
    CHECKIN: string;
    CRMSTATEID: number;
    HADI: string;
    HSOYADI: string;
    PHONE: string;
    EMAIL: string;
    RELATEDPERSON: string;
    ISLEMTYPEID: number;
    YONTEMID: number;
}

export interface UserData {
    USERID: number;
    ADI: string;
    PASIF: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AngSchedulerService {

    config: any = {};

    constructor(
        //public api: ApiService,
        //public dialog: AngusDialog,
        public http: HttpClient,

    ) { }

    //Burası taşırken silincek -----
    async getSchedulerConfig() {
        const body = {
            "Action": "GetConfig",
            "ConfigName": "scheduler.medical-crm-calendar.config",
            "LoginToken": loginToken
        }
        const result = await firstValueFrom(this.http.post<any>('https://7002.hoteladvisor.net', body));
        return result;

    }
    //-----
    async getResources() {
        /*try {
          return await this.api.select(resourcesRequest);
        } catch (error) {
          console.error('getUsers error:', error);
        }*/
        const body = {
            "Action": "Select",
            "Object": "USER",
            "Select": ["USERID", "PASIF", "ADI"],
            "Where": [{ "Column": "SUBEID", "Operator": "IN", "Value": ["30"], "IsNull": "30" }]
            , "OrderBy": [{ "Column": "ADI", "Direction": "ASC" }],
            "Paging": { "Current": 1, "ItemsPerPage": 100 },
            "LoginToken": loginToken
        }

        const result = await firstValueFrom(this.http.post<any>('https://7002.hoteladvisor.net/Select/USER', body));
        return result
    }

    async getEvents() {
        /*try {
          return await this.api.select(eventsRequest);
        } catch (error) {
          console.error('getRes error:', error);
        }*/
        const body = {
            "Action": "Select",
            "Object": "VW_MT_CONTACTREQUEST_ACTION",
            "Select": ["*"],
            "Where": [{ "Column": "ACTIONSTART", "Operator": ">=", "Value": "2024-01-24" }, { "Column": "ACTIONSTART", "Operator": "<=", "Value": "2024-01-24" },
            { "Column": "SUBEID", "Operator": "IN", "Value": ["30"], "IsNull": "30" }],
            "Paging": { "Current": 1, "ItemsPerPage": 100 },
            "LoginToken": loginToken
        }

        const result = await firstValueFrom(this.http.post<any>('https://7002.hoteladvisor.net/Select/VW_MT_CONTACTREQUEST_ACTION', body));
        return result
    }

    async getDepartmentSettings() {
        /*try {
          //console.log("TENANT"+ JSON.stringify(this.api.tenant))
          return await this.api.select(departmentObject);
          
        } catch (error) {
          console.error('getRes error:', error);
        }*/
        const body = {
            "Action": "Select",
            "Object": "SUBE_AYARLARI",
            "Select": ["*"],
            "Where": [{ "Column": "SUBEID", "Operator": "IN", "Value": ["30"], "IsNull": "30" }],
            "Paging": { "Current": 1, "ItemsPerPage": 100 },
            "LoginToken": loginToken
        }

        const result = await firstValueFrom(this.http.post<any>('https://7002.hoteladvisor.net/Select/SUBE_AYARLARI', body));
        return result
    }

    /*async eventResizeUpdate(actionId: number, startDate: string, endDate: string, userId: number) {
      try {
        const resp = await this.api.execSP({
          Object: 'SP_MEDCRM_CALENDARRESUPDATE',
          Parameters: {
            ID: actionId,
            NEWSTARTDATE: startDate,
            NEWENDDATE: endDate,
            NEWUSERID: userId
          }
        }).toPromise();
    
        if (resp?.[0]?.[0]?.SUCCESS) {
          return true;
        } else {
          this.dialog.alert(resp?.[0]?.[0]?.MESSAGE ?? 'İşlem Başarısız!');
          return false;
        } 
      } catch (error) {
        console.error('resResizeUpdate error:', error);
      }
    }*/

    /*async deleteEvent(eventID) {
      try {
        return await this.api.delete({
          Object: 'MT_CONTACTREQUEST_ACTION',
          Keys: [eventID]
        })
      } catch (error) {
        console.error('deleteEvent error:', error);
      }
    }*/

}