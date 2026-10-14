import ChatRoom from "./ChatRoom";

export default async function RoomPage({ params }) {
  const { id } = await params;

  return <ChatRoom roomId={id} />;
}
