import { suits } from "../assets/suits";
import { cardBack, cardJoker, cards } from "./../assets/cards";
import { WebFontFile } from "./objects";

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {
    for (let index = 0; index < cards.length; index++) {
      this.load.image(`card_${index + 1}`, cards[index]);
    }
    this.load.image(`card_back`, cardBack);
    this.load.image(`card_joker`, cardJoker);

    suits.forEach((suit: { name: string, asset: string }) => this.load.image(suit.name, suit.asset));

    this.load.addFile(new WebFontFile(this.load, 'Roboto'));
  }

  create() {
    this.scene.start('MainScene');
  }
}
