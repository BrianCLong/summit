export interface ExtractedEntity {
    name: string;
    mentions: number;
    recommended: boolean;
    rank?: number;
}

export class AnswerParser {
    private brands: string[];

    constructor(brands: string[]) {
        this.brands = brands;
    }

    public parse(answerText: string): ExtractedEntity[] {
        const entities: ExtractedEntity[] = [];
        const lines = answerText.split('\n');

        this.brands.forEach(brand => {
            let mentions = 0;
            let recommended = false;
            let rank: number | undefined = undefined;

            lines.forEach((line) => {
                const lowerLine = line.toLowerCase();
                const lowerBrand = brand.toLowerCase();

                if (lowerLine.includes(lowerBrand)) {
                    mentions++;

                    if (lowerLine.includes('best') || lowerLine.includes('recommend') || lowerLine.includes('top')) {
                        recommended = true;
                    }

                    const rankMatch = line.trim().match(/^(\d+)[\.\)]/);
                    if (rankMatch) {
                        const currentRank = parseInt(rankMatch[1], 10);
                        if (rank === undefined || currentRank < rank) {
                            rank = currentRank;
                        }
                    }
                }
            });

            if (mentions > 0) {
                entities.push({
                    name: brand,
                    mentions,
                    recommended,
                    rank
                });
            }
        });

        return entities;
    }
}
