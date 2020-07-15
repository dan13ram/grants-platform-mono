import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { NavParams } from '@ionic/angular';
import { UserManagementService } from 'src/app/services/user-management.service';
import { AuthService } from 'src/app/services/auth.service';
import { AppSettings } from 'src/app/config/app.config';
import { EthcontractService } from 'src/app/services/ethcontract.service';

declare let window: any;

@Component({
  selector: 'app-popup',
  templateUrl: './popup.component.html',
  styleUrls: ['./popup.component.scss'],
})
export class PopupComponent implements OnInit {
  modelType: string;
  data: any;
  loging = false;
  loginSuccess = false;
  loginError = false;

  deploying = false;
  deploySuccess = false;
  deployError = false;

  canceling = false;
  canceledSuccess = false;
  canceledFail = false;

  funding = false;
  fundingSuccess = false;
  fundingError = false;

  payouting = false;
  payoutSuccess = false;
  payoutError = false;

  constructor(
    public modalCtrl: ModalController,
    private navParams: NavParams,
    private authService: AuthService,
    private ethcontractService: EthcontractService,
    private userManagementService: UserManagementService
  ) {
    this.modelType = this.navParams.get('modelType');
    this.data = this.navParams.get('data');
    console.log("modelType", this.modelType, this.data);
  }

  ngOnInit() {
    if (this.modelType == 'login') {
      this.login();
    }

    if (this.modelType == 'deployContract') {
      this.deployContract();
    }

    if (this.modelType == 'cancelContract') {
      this.cancelContract();
    }

    if (this.modelType == 'fundingContract') {
      this.fundingContract();
    }

    if (this.modelType == 'payout') {
      this.contractPayout();
    }
  }

  dismiss() {
    this.modalCtrl.dismiss()
  }

  async login() {
    try {
      this.loging = true;
      await window.web3.currentProvider.enable();
      let nouce = Math.floor(Math.random() * 1000000);
      let userEthAddress = window.web3.eth.coinbase
      console.log("userEthAddress", userEthAddress);

      let signMessage: any = await this.handleSignMessage(userEthAddress, nouce)
      this.userManagementService.setUserEthAddress(userEthAddress);
      localStorage.setItem(AppSettings.localStorage_keys.currentNetwork, "Ropsten");
      localStorage.setItem(AppSettings.localStorage_keys.nouce, nouce.toString());
      localStorage.setItem(AppSettings.localStorage_keys.userSign, JSON.stringify(signMessage));
      this.authService.setAuthState({ is_logged_in: true });

      this.loging = false;
      this.loginSuccess = true;

      setTimeout(() => {
        this.dismiss()
      }, 2000)
    } catch (e) {
      this.loging = false;
      this.loginError = true;
    }
  }

  handleSignMessage(publicAddress, nonce) {
    return new Promise((resolve, reject) => {
      window.web3.personal.sign(
        window.web3.fromUtf8(`I am signing my one-time nonce: ${nonce}`),
        publicAddress,
        (err, signature) => {
          if (err) reject(err);
          resolve({ publicAddress, signature });
        }
      )
    })
  }

  async deployContract() {
    try {
      this.deploying = true;
      let contract: any = await this.ethcontractService.createGrant(this.data);

      if (contract.status == "success") {
        this.deploying = false;
        this.deploySuccess = true;

        setTimeout(() => {
          this.modalCtrl.dismiss({ redirect: true })
        }, 2000)
      } else {
        this.deploying = false;
        this.deployError = true;
      }
    } catch (e) {
      this.deploying = false;
      this.deployError = true;
    }
  }

  async cancelContract() {
    this.canceling = true;
    let contract: any = await this.ethcontractService.cancelGrant(this.data);

    if (contract.status == "success") {
      this.canceling = false;
      this.canceledSuccess = true;

      setTimeout(() => {
        this.modalCtrl.dismiss({ reload: true })
      }, 2000)
    } else {
      this.canceling = false;
      this.canceledFail = true;
    }
  }

  async fundingContract() {
    this.funding = true;
    let funding: any = await this.ethcontractService.fund(this.data.grantAddress, this.data.amount);

    if (funding.status == "success") {
      this.funding = false;
      this.fundingSuccess = true;

      setTimeout(() => {
        this.modalCtrl.dismiss({ reload: true })
      }, 2000)
    } else {
      this.funding = false;
      this.fundingError = true;
    }
  }

  async contractPayout() {
    this.payouting = true;
    let payoutRes: any = await this.ethcontractService.approvePayout(this.data.grantAddress, this.data.grantee, this.data.amount)

    if (payoutRes.status == "success") {
      this.payouting = false;
      this.payoutSuccess = true;

      setTimeout(() => {
        this.modalCtrl.dismiss({ reload: true })
      }, 2000)
    } else {
      this.payouting = false;
      this.payoutError = true;
    }
  }
}