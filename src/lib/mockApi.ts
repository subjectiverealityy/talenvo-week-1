export type MoveCardPayload = {
  cardId: string;
  sourceColumnId: string;
  destinationColumnId: string;
  newIndex: number;
};

export async function updateCardPosition(_payload: MoveCardPayload): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150));
}
