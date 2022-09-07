import { suitAsset } from "../assets/suits";
import { TurnController, TurnCommand, TurnEvent, ViewEventHandler, Player, Card, PlayContext, CardSuit, changesSuit, validatePlay, cardAsset, CardRank } from "./objects";
import { Store } from 'react-notifications-component';

const NAME_FONT = { color: '#ffffff', fontSize: '14px', fontFamily: "'Roboto'" };
const PLAYER_POSITIONS = [
    { x: 22, y: 522 - 4, hx: 22, hy: 522, dx: 22, dy: 0 },
    { x: 22, y: 162 - 4, hx: 22, hy: 162, dx: 0, dy: 11 },
    { x: 22, y: 18, hx: 22, hy: 22, dx: 22, dy: 0 },
    { x: 380, y: 162 - 4, hx: 380, hy: 162, dx: 0, dy: 11 }
];
export default class MainScene extends Phaser.Scene implements ViewEventHandler {
    controller: TurnController;

    selectedCards: Card[];
    handCardImages: Phaser.GameObjects.Image[][];
    nameLabels: Phaser.GameObjects.Text[];

    pileImages: Phaser.GameObjects.Image[];

    storedTurnCallback: ((turn: TurnCommand) => void) | undefined;
    playContext?: PlayContext;
    playedImages: Phaser.GameObjects.Image[];
    forcedSuitImage!: Phaser.GameObjects.Image;

    constructor() {
        super({ key: 'MainScene' });

        this.controller = new TurnController({ me: { name: "Jason" } }, this);
        this.selectedCards = [];
        this.handCardImages = [];
        this.nameLabels = [];
        this.pileImages = [];
        this.playedImages = [];
    }

    create() {
        this.controller.startGame();
    }

    promptForSuitChange() {
        // slide in the suits and allow the user to select one
        return new Promise<CardSuit>((resolve, _) => {

            const suits = [
                this.add.image(this.cameras.main.centerX - 50, this.cameras.main.centerY + 148, "suit_clubs")
                    .setZ(2)
                    .setInteractive()
                    .on('pointerup', () => choose(CardSuit.Clubs)),
                this.add.image(this.cameras.main.centerX - 150, this.cameras.main.centerY + 148, "suit_diamonds")
                    .setZ(2)
                    .setInteractive()
                    .on('pointerup', () => choose(CardSuit.Diamonds)),
                this.add.image(this.cameras.main.centerX + 50, this.cameras.main.centerY + 148, "suit_hearts")
                    .setZ(2)
                    .setInteractive()
                    .on('pointerup', () => choose(CardSuit.Hearts)),
                this.add.image(this.cameras.main.centerX + 150, this.cameras.main.centerY + 148, "suit_spades")
                    .setZ(2)
                    .setInteractive()
                    .on('pointerup', () => choose(CardSuit.Spades)),
            ]

            const choose = (chosen: CardSuit) => {
                suits.forEach(img => img.destroy());
                resolve(chosen);
            }
        });

        // this.tweens.add({
        //     targets: bob,
        //     duration: 2000,
        //     y: 650,
        //     delay: Math.random() * 2,
        //     ease: 'Sine.easeInOut',
        //     repeat: -1,
        //     yoyo: true
        // });
    }

    drawPileImages(count: number) {
        const images = [];
        for (let i = 0; i < count; i++) {
            images.push(
                this.add.image(this.cameras.main.centerX + (4 * i), this.cameras.main.centerY - 4, 'card_back')
                    .setOrigin(0.5, 1)
                    .setInteractive()
                    .on('pointerup', this.onPickupCards.bind(this))
            );
        }
        return images;
    }

    /// ViewEventHandler

    onCardsDealt(hand: Card[], handCounts: number[], names: string[], context: PlayContext): void {

        this.handCardImages = new Array(handCounts.length).fill(undefined).map(_ => []);
        this.nameLabels = new Array(handCounts.length).fill(undefined);
        this.playContext = context;

        // Draw players cards
        // handCounts starts with us at index 0 and goes around clockwise all players, same as names
        names.forEach((name, i) => {
            const cards = i === 0 ?
                hand :
                new Array(handCounts[i]).fill({ suit: CardSuit.None, rank: CardRank.None } as Card);
            this.drawName(i, name)
            this.drawCards(i, cards);
        });

        // Draw the last played cards
        this.playedImages = [this.add.image(this.cameras.main.centerX, this.cameras.main.centerY + 4, cardAsset(context.lastCard))
            .setOrigin(0.5, 0)
            .setInteractive()
            .on('pointerup', this.onPlaySelectedCards.bind(this))
        ];

        // Draw the main pile of cards
        this.add.image(this.cameras.main.centerX, this.cameras.main.centerY - 4, 'card_back').setOrigin(0.5, 1);

        this.forcedSuitImage = this.add.image(this.cameras.main.centerX - 90, this.cameras.main.centerY, 'suit_spades').setVisible(false);

        // Draw the pickup pile on top of this
        this.pileImages = this.drawPileImages(context.numberToPickup);
    }

    onTurnStarted(relativePlayerIndex: number, relativeNextPlayerIndex: number, aiTurn: Promise<TurnCommand>) {
        this.nameLabels.forEach((text, i) => {
            if (i === relativePlayerIndex) {
                text.setTint(0x10FB12);
            } else if (i === relativeNextPlayerIndex) {
                text.setTint(0x54FBCC);
            } else {
                text.clearTint();
            }
        })

        return new Promise<TurnCommand>((resolve, _) => {
            if (relativePlayerIndex === 0) {
                // It's my turn!
                this.storedTurnCallback = resolve;
            } else {
                resolve(aiTurn);
            }
        });
    }

    onTurnEnded(relativePlayerIndex: number, hand: Card[], turn: TurnEvent): void {
        // TODO: we could do some nice animations here, we have all the references to GameObjects
        this.drawCards(relativePlayerIndex, hand);

        if (turn.played.length > 0) {
            this.playedImages.forEach(x => x.destroy());
            this.playedImages = turn.played.map((card, i) => {
                return this.add.image(this.cameras.main.centerX + (i * 16), this.cameras.main.centerY + 4, cardAsset(card))
                    .setOrigin(0.5, 0)
                    .setInteractive()
                    .on('pointerup', this.onPlaySelectedCards.bind(this))
            });
        }
    }

    onContextUpdated(context: PlayContext) {
        this.playContext = context;

        // Update the forced suit image
        const forcedSuitTexture = suitAsset(context.suit);
        if (forcedSuitTexture) {
            this.forcedSuitImage.setTexture(forcedSuitTexture).setVisible(true);
        } else {
            this.forcedSuitImage.setVisible(false);
        }

        // Update the forced pickup pile count
        if (context.numberToPickup !== this.pileImages.length) {
            this.pileImages.forEach(img => img.destroy());
            this.pileImages = this.drawPileImages(context.numberToPickup);
        }
    }

    onGameOver(player: Player) {

        this.showErrorNotification(`${player.name} wins! Starting new game in 5 seconds...`);

        setTimeout(() => {
            this.selectedCards = [];
            this.handCardImages.forEach(array => array.forEach(image => image.destroy()));
            this.nameLabels.forEach(image => image.destroy());
            this.pileImages.forEach(image => image.destroy());
            this.playedImages.forEach(image => image.destroy());

            this.controller.startGame();
        }, 5000);
    }


    onCardSelected(card: Card, image: Phaser.GameObjects.Image): void {
        if (!this.storedTurnCallback) return;

        const index = this.selectedCards.indexOf(card);
        if (index >= 0) {
            // already selected, so remove everything past this point
            this.handCardImages[0].forEach(img => img.clearTint());
            this.selectedCards = [];
        } else {
            image.setTint(0xFF0000, 0xFF0000, 0xFF00FF, 0xFFFF00);
            this.selectedCards.push(card);
        }
    }

    drawName(index: number, name: string): void {
        if (!this.nameLabels[index]) {
            this.nameLabels[index] = this.add.text(PLAYER_POSITIONS[index].x, PLAYER_POSITIONS[index].y, name, NAME_FONT)
                .setOrigin(0, 1);
        }
    }

    drawCards(index: number, cards: Card[]): void {
        this.selectedCards = [];

        cards.sort((a, b) => a.suit === b.suit ? (a.rank - b.rank) : (a.suit - b.suit));

        // we must add / remove specific cards as we can see their faces
        // TODO: we can be more efficient here rather than throwing away the world and re-drawing it all
        this.handCardImages[index].forEach(x => x.destroy());
        this.handCardImages[index] = cards.map((card, i) => {
            const assetId = cardAsset(card);
            const image = this.add.image(
                PLAYER_POSITIONS[index].hx + (i * PLAYER_POSITIONS[index].dx),
                PLAYER_POSITIONS[index].hy + (i * PLAYER_POSITIONS[index].dy),
                assetId
            );

            image.setOrigin(0, 0).setData('card', card);

            if (index === 0) {
                image.setInteractive().on('pointerup', () => this.onCardSelected(card, image));
            }
            return image;
        });
    }

    async onPickupCards(pointer: PointerEvent): Promise<void> {
        if (!this.playContext) {
            this.showErrorNotification("Cannot pickup without a current context");
            return;
        };

        if (this.storedTurnCallback) {
            this.storedTurnCallback({
                pickup: true,
                played: [],
                suit: CardSuit.None
            });

            this.selectedCards = [];
            this.storedTurnCallback = undefined;
        }
    }

    async onPlaySelectedCards(pointer: PointerEvent): Promise<void> {
        if (!this.playContext) {
            this.showErrorNotification("Cannot play without a current context");
            return;
        };

        const errors = validatePlay(this.selectedCards, this.playContext);

        if (errors.length !== 0) {
            this.showErrorNotification(errors.join("\n"))
            return;
        }

        if (this.storedTurnCallback) {
            const topCard = this.selectedCards[this.selectedCards.length - 1];
            const promptForSuitChange = changesSuit(topCard);

            let suit = CardSuit.None;
            if (promptForSuitChange) {
                suit = await this.promptForSuitChange();
            }
            this.storedTurnCallback({
                pickup: false,
                played: this.selectedCards,
                suit: suit,
            });

            this.selectedCards = [];
            this.storedTurnCallback = undefined;
        }
    }

    showErrorNotification(message: string) {
        Store.addNotification({
            title: "",
            message: message,
            type: "danger",
            insert: "top",
            container: "bottom-full",
            animationIn: ["animate__animated", "animate__fadeIn"],
            animationOut: ["animate__animated", "animate__fadeOut"],
            dismiss: {
                duration: 5000,
                pauseOnHover: true
            }
        });
    }

}
