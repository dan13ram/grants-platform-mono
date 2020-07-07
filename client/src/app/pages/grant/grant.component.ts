import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, Events } from '@ionic/angular';
import { ToastrService } from 'ngx-toastr';
import { SubgraphService } from 'src/app/services/subgraph.service';
import { AuthService } from 'src/app/services/auth.service';
import { EthcontractService } from 'src/app/services/ethcontract.service';
import { async } from '@angular/core/testing';
import { UserManagementService } from 'src/app/services/user-management.service';
import { AddressZero, Zero } from "ethers/constants";
import { ethers, providers, utils } from 'ethers';
import * as moment from 'moment';
import Swal from 'sweetalert2';
import { PayoutComponent } from '../payout/payout.component';
import { PopupComponent } from '../popup/popup.component';


@Component({
  selector: 'app-grant',
  templateUrl: './grant.component.html',
  styleUrls: ['./grant.component.scss'],
})
export class GrantComponent implements OnInit {
  grantAddress: string;
  grantData: any;
  userEthAddress: string;
  noOfDayToExpiredFunding: number = 0;

  userEnum = {
    VISITOR: "visitor",
    DONOR: "donor",
    MANAGER: "manager",
    GRANTEE: "grantee",
  }
  userRoll = this.userEnum.VISITOR;

  grantFunds = [];
  userFunds = [];
  userDonation: any = 0;
  userAlloc: any = 0;
  userRemainingAlloc: any = 0;

  fundingModel = {
    amount: null
  }

  constructor(
    public events: Events,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    public modalController: ModalController,
    private subgraphService: SubgraphService,
    private authService: AuthService,
    public router: Router,
    private ethcontractService: EthcontractService,
    private userManagementService: UserManagementService,
  ) {
    this.grantAddress = this.route.snapshot.params.id || '';

    (async () => {
      let response: any = await this.subgraphService.getGrantByAddress(this.grantAddress).toPromise();
      this.grantData = response.data.contract;
      this.checkRoll()
      console.log("grantData", this.grantData);

      this.noOfDayToExpiredFunding = moment(+this.grantData.fundingExpiration).diff(moment(new Date), 'days')
      console.log("fundingExpiration", moment(+this.grantData.fundingExpiration).format())

      this.subgraphService.getFundByContract(this.grantAddress).subscribe((res: any) => {
        this.grantFunds = res.data.funds;
      })

    })();

    this.getUserEthAddress();
  }

  ngOnInit() {
    this.events.subscribe('is_logged_in', (data) => {
      setTimeout(() => {
        this.checkRoll();
      }, 100);
    });
  }

  getUserEthAddress() {
    this.userEthAddress = this.authService.getAuthUserId();
    console.log("userEthAddress", this.userEthAddress)
  }

  currencyCovert(currencyType, amount) {
    if (currencyType == AddressZero) {
      return ethers.utils.formatEther(amount);
    }
    return amount;
  }

  checkRoll() {
    this.getUserEthAddress()

    if (this.userEthAddress) {
      this.userRoll = this.userEnum.DONOR;

      if (this.grantData.manager.toLowerCase() == this.userEthAddress.toLowerCase()) {
        this.userRoll = this.userEnum.MANAGER;
      }

      if (this.userRoll == this.userEnum.DONOR) {
        this.getDonorData();
      }

      if (this.userRoll == this.userEnum.MANAGER) {
        this.getManagerData();
      }

      if (this.userRoll == this.userEnum.GRANTEE) {
        this.getGranteeData();
      }
    } else {
      this.userRoll = this.userEnum.VISITOR;
    }

    console.log("userRoll", this.userRoll);
  }

  getDonorData() {
    this.subgraphService.getFundByContractAndDonor(this.grantAddress, this.userEthAddress).subscribe((res: any) => {
      this.userFunds = res.data.funds;
      this.userFunds = this.userFunds.map((task) => {
        if (this.grantData.currency == AddressZero) {
          task.amount = ethers.utils.formatEther(task.amount);
          this.userDonation += +task.amount;
        } else {
          this.userDonation += +task.amount;
        }
        return task;
      });
    })
  }

  getManagerData() {

  }

  async getGranteeData() {
    try {
      this.userRemainingAlloc = await this.ethcontractService.remainingAllocation(this.grantAddress, this.userEthAddress);
    } catch (e) { }
  }

  async payoutModel() {
    const modal = await this.modalController.create({
      component: PayoutComponent,
      cssClass: 'custom-modal-style',
      mode: "ios",
      componentProps: {
        grantAddress: this.grantAddress
      }
    });

    modal.onDidDismiss()
      .then((data) => {
      });

    return await modal.present();
  }


  cancelGrant() {
    Swal.fire({
      title: 'Are you sure cancle the grant?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      backdrop: false,
      allowOutsideClick: false,
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No',
      reverseButtons: true
    }).then(async (result) => {
      if (result.value) {
        const modal = await this.modalController.create({
          component: PopupComponent,
          cssClass: 'custom-modal-style',
          mode: "ios",
          componentProps: {
            modelType: "cancelContract",
            data: this.grantAddress
          }
        });

        modal.onDidDismiss()
          .then((data: any) => {
            data = data.data;
            console.log("data", data);
            if (data && data.hasOwnProperty('reload') && data.reload) {
              console.log("data", data);
              this.subgraphService.getGrantByAddress(this.grantAddress).subscribe((res: any) => {
                this.grantData = res.data.contract;
              });
            }
          });

        return await modal.present();
      } else if (
        result.dismiss === Swal.DismissReason.cancel
      ) {
        // Swal.fire('Cancelled', 'Your request cancelled :)', 'error');
      }
    })
  }

  grantFunding() {
    this.getUserEthAddress()

    if (this.userEthAddress) {
      Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        backdrop: false,
        allowOutsideClick: false,
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        reverseButtons: true
      }).then(async (result) => {
        if (result.value) {
          let amount: any = this.fundingModel.amount;
          if (this.grantData.currency == AddressZero) {
            amount = (ethers.utils.parseEther(this.fundingModel.amount.toString())).toString();
          }
          const modal = await this.modalController.create({
            component: PopupComponent,
            cssClass: 'custom-modal-style',
            mode: "ios",
            componentProps: {
              modelType: "fundingContract",
              data: { grantAddress: this.grantAddress, amount: amount }
            }
          });

          modal.onDidDismiss()
            .then((data: any) => {
              data = data.data;
              this.fundingModel.amount = null;
              if (data && data.hasOwnProperty('reload') && data.reload) {
                this.subgraphService.getGrantByAddress(this.grantAddress).subscribe((res: any) => {
                  this.grantData = res.data.contract;
                });
              }
            });

          return await modal.present();
        } else if (
          result.dismiss === Swal.DismissReason.cancel
        ) {
        }
      })
    } else {
      this.toastr.warning("Please login the App");
    }
  }

}